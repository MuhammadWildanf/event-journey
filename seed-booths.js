import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import QRCode from "qrcode";
import admin from "firebase-admin";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================================
// Init Firebase
// ================================
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

// ================================
// MAIN FUNCTION
// ================================
async function main() {
  /* ======================================
     GENERATE BOOTH QR
  ====================================== */

  const boothCount = 12;
  const boothDir = path.join(__dirname, "qr", "booths");
  await fs.mkdir(boothDir, { recursive: true });

  const booths = {};

  for (let i = 1; i <= boothCount; i++) {
    const code = `BOOTH-${i}`;
    const name = `Booth ${i}`;

    const pngPath = path.join(boothDir, `${code}.png`);

    await QRCode.toFile(pngPath, code, { width: 400 });

    booths[code] = {
      name,
      qrUrl: `/qr/booths/${code}.png`,
    };
  }

  await db.ref("booths").set(booths);
  console.log(`✅ QR Booth selesai (${boothCount} booth)`);


  /* ======================================
     GENERATE LUNCH & SOUVENIR QR
  ====================================== */

  const serviceDir = path.join(__dirname, "qr", "services");
  await fs.mkdir(serviceDir, { recursive: true });

  // 🔹 QR untuk LUNCH
  const lunchCode = "lunch";
  await QRCode.toFile(path.join(serviceDir, "lunch.png"), lunchCode, {
    width: 400,
  });

  // 🔹 QR untuk SOUVENIR
  const souvenirCode = "souvenir";
  await QRCode.toFile(path.join(serviceDir, "souvenir.png"), souvenirCode, {
    width: 400,
  });

  // Simpan metadata ke firebase (opsional)
  await db.ref("services").set({
    lunch: {
      code: "lunch",
      qrUrl: "/qr/services/lunch.png",
    },
    souvenir: {
      code: "souvenir",
      qrUrl: "/qr/services/souvenir.png",
    },
  });

  console.log("✅ QR Lunch & Souvenir selesai dibuat");
}

main().catch(console.error);
