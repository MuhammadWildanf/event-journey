import express from "express";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
export { db };
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "scm_digitalday_secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/qr", express.static(path.join(__dirname, "qr")));

const countVisited = (obj = {}) => Object.values(obj).filter(Boolean).length;

app.use("/", authRoutes);


app.get("*", (req, res) => {
  res.redirect("/login");
});


const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
