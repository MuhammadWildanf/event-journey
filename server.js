import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔹 Firebase Admin (pakai ENV)
admin.initializeApp({
  credential: admin.credential.cert({
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
  }),
  databaseURL: process.env.FIREBASE_DB_URL,
});

const db = admin.database();
const app = express();

app.use(cors());
app.use(express.json());

// serve frontend
app.use(express.static(path.join(__dirname, "public")));
app.use("/qr", express.static(path.join(__dirname, "qr")));

// Helper
const countVisited = (obj = {}) => Object.values(obj).filter(Boolean).length;

//
// =============================
// 🔹 REGISTER USER (UPDATED)
// =============================
app.post("/api/register", async (req, res) => {
  const { name, phone, password } = req.body;

  // Validasi input
  if (!name || !phone || !password) {
    return res.status(400).json({ error: "Name, phone, and password are required" });
  }

  // Cek apakah nomor sudah terdaftar
  const usersSnap = await db.ref("users").get();
  let exists = false;
  usersSnap.forEach((child) => {
    const u = child.val();
    if (u.phone === phone) exists = true;
  });

  if (exists) {
    return res.status(409).json({ error: "Phone already registered" });
  }

  // Simpan user baru
  const ref = db.ref("users").push();
  await ref.set({
    name,
    phone,
    password, // ⚠️ nanti bisa diganti hash (bcrypt)
    booths_visited: {},
    visited_count: 0,
    reward_ready: false,
    reward_claimed: false,
    created_at: new Date().toISOString(),
  });

  res.json({ userId: ref.key });
});

//
// =============================
// 🔹 SCAN BOOTH
// =============================
app.post("/api/scan", async (req, res) => {
  const { userId, boothCode } = req.body;
  if (!userId || !boothCode) return res.status(400).send("missing data");

  const userRef = db.ref(`users/${userId}`);
  const snap = await userRef.get();
  if (!snap.exists()) return res.status(404).send("user not found");

  const user = snap.val();

  // Jika sudah pernah scan booth yang sama
  if (user.booths_visited?.[boothCode]) {
    return res.json({ message: "already scanned" });
  }

  // Simpan kunjungan baru
  await userRef.child(`booths_visited/${boothCode}`).set(true);

  const newCount = countVisited({ ...user.booths_visited, [boothCode]: true });
  const update = { visited_count: newCount };
  if (newCount >= 5) update.reward_ready = true;

  await userRef.update(update);
  res.json({ visited_count: newCount, reward_ready: !!update.reward_ready });
});

//
// =============================
// 🔹 KLAIM HADIAH
// =============================
app.post("/api/claim", async (req, res) => {
  const { userId } = req.body;
  const ref = db.ref(`users/${userId}`);
  const snap = await ref.get();
  if (!snap.exists()) return res.status(404).send("user not found");

  const user = snap.val();
  if (!user.reward_ready) return res.status(400).send("reward not ready");

  await ref.update({ reward_claimed: true });
  res.json({ success: true });
});

//
// =============================
// 🔹 LIST BOOTH
// =============================
app.get("/api/booths", async (_, res) => {
  const snap = await db.ref("booths").get();
  res.json(snap.val());
});

//
// =============================
// 🔹 DEFAULT (FRONTEND)
// =============================
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
});
