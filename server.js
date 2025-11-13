import express from "express";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import serverless from "serverless-http"; // penting

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================================================
// ✅ Firebase Admin
// ==================================================
if (!admin.apps.length) {
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
}

const db = admin.database();
export { db };

// ==================================================
// ✅ Express setup
// ==================================================
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

// View engine + public folder
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/qr", express.static(path.join(__dirname, "qr")));

// Routes
app.use("/", authRoutes);

// Default redirect
app.get("*", (req, res) => res.redirect("/login"));

// ==================================================
// ✅ Dual mode (Local & Vercel)
// ==================================================
const PORT = process.env.PORT || 3002;

if (process.env.VERCEL) {
  console.log("Running on Vercel serverless");
}

// Jalankan hanya jika di local (tanpa VERCEL)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Local server running at http://localhost:${PORT}`);
  });
}

// Export untuk Vercel
export default serverless(app);
