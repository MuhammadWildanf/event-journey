import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================================================
// 🔹 Generate firebase-config.js only if content differs
// ==================================================
const firebaseConfigPath = path.join(__dirname, "public", "firebase-config.js");

const firebaseConfigData = `
export const firebaseConfig = {
  apiKey: "${process.env.PUBLIC_FIREBASE_API_KEY}",
  authDomain: "${process.env.PUBLIC_FIREBASE_AUTH_DOMAIN}",
  databaseURL: "${process.env.PUBLIC_FIREBASE_DATABASE_URL}",
  projectId: "${process.env.PUBLIC_FIREBASE_PROJECT_ID}",
  storageBucket: "${process.env.PUBLIC_FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${process.env.PUBLIC_FIREBASE_APP_ID}",
  measurementId: "${process.env.PUBLIC_FIREBASE_MEASUREMENT_ID}"
};
`.trim();

// ✅ hanya tulis jika belum ada atau berbeda
let shouldWrite = true;
if (fs.existsSync(firebaseConfigPath)) {
  const existing = fs.readFileSync(firebaseConfigPath, "utf8").trim();
  if (existing === firebaseConfigData) {
    shouldWrite = false;
  }
}

if (shouldWrite) {
  fs.writeFileSync(firebaseConfigPath, firebaseConfigData, "utf8");
  console.log("✅ Firebase config generated → public/firebase-config.js");
} else {
  console.log("ℹ️ Firebase config unchanged, skip writing");
}

// ==================================================
// 🔹 Firebase Admin SDK (pakai env variabel server)
// ==================================================
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

// ==================================================
// 🔹 Serve frontend files
// ==================================================
app.use(express.static(path.join(__dirname, "public")));
app.use("/qr", express.static(path.join(__dirname, "qr")));

// ==================================================
// 🔹 Helper function
// ==================================================
const countVisited = (obj = {}) => Object.values(obj).filter(Boolean).length;

// ==================================================
// 🔹 REGISTER USER
// ==================================================
app.post("/api/register", async (req, res) => {
  const { name, phone, password } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ error: "Name, phone, and password are required" });
  }

  // Cek nomor WA sudah terdaftar
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
    password, // ⚠️ plain-text sementara
    booths_visited: {},
    visited_count: 0,
    reward_ready: false,
    reward_claimed: false,
    created_at: new Date().toISOString(),
  });

  res.json({ userId: ref.key });
});

// ==================================================
// 🔹 SCAN BOOTH
// ==================================================
app.post("/api/scan", async (req, res) => {
  const { userId, boothCode } = req.body;
  if (!userId || !boothCode) return res.status(400).send("missing data");

  const userRef = db.ref(`users/${userId}`);
  const snap = await userRef.get();
  if (!snap.exists()) return res.status(404).send("user not found");

  const user = snap.val();

  // Cegah double scan
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

// ==================================================
// 🔹 KLAIM HADIAH
// ==================================================
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

// ==================================================
// 🔹 LIST BOOTH
// ==================================================
app.get("/api/booths", async (_, res) => {
  const snap = await db.ref("booths").get();
  res.json(snap.val());
});

// ==================================================
// 🔹 FRONTEND DEFAULT ROUTE
// ==================================================
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==================================================
// 🔹 START SERVER
// ==================================================
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
