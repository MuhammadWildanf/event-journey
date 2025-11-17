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
// Helper → slug + fileName sanitizer
// ================================
function slug(str) {
  return str
    .toLowerCase()
    .normalize("NFD")                     // buang karakter spesial
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")                // fix simbol
    .replace(/[^a-z0-9]+/g, "_")         // ganti semua non-alfanumerik jadi _
    .replace(/_+/g, "_")                 // hapus double underscore
    .replace(/^_+|_+$/g, "");            // trim
}

function fileNameSafe(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ================================
// MAIN FUNCTION
// ================================
async function main() {
  /* =======================================================
     1. GENERATE BOOTH QR
  ======================================================= */

  const boothNames = [
    "SCM System",
    "TKDN",
    "Logistic",
    "Procurement & Planning",
    "General Services",
    "PT Pertamina (Persero)",
    "SCM Regional 1",
    "SCM Regional 2",
    "SCM Regional 3",
    "SCM Regional 4",
  ];

  const boothDir = path.join(__dirname, "qr", "booths");
  await fs.mkdir(boothDir, { recursive: true });

  const booths = {};

  for (const boothName of boothNames) {
    const key = slug(boothName);              // firebase + QR payload
    const fileName = fileNameSafe(boothName) + ".png";
    const filePath = path.join(boothDir, fileName);

    // QR now contains ONLY the slug (best practice)
    await QRCode.toFile(filePath, key, { width: 500 });

    booths[key] = {
      key: key,
      name: boothName,
      code: key,
      qrPayload: key,
      qrUrl: `/qr/booths/${fileName}`,
    };

    console.log(`🎟 Booth QR created: ${fileName} → ${key}`);
  }

  await db.ref("booths").set(booths);
  console.log(`✅ Booth QR selesai dibuat (${boothNames.length} booth)`);



  /* =======================================================
     2. GENERATE SERVICES QR
  ======================================================= */

  const serviceDir = path.join(__dirname, "qr", "services");
  await fs.mkdir(serviceDir, { recursive: true });

  const services = [
    { code: "lunch", name: "Lunch" },
    { code: "souvenir", name: "Souvenir" },
    { code: "checkin", name: "Check-In" },
  ];

  const servicesMeta = {};

  for (const svc of services) {
    const fileName = `${svc.code}.png`;
    const filePath = path.join(serviceDir, fileName);

    // QR berisi code langsung
    await QRCode.toFile(filePath, svc.code, { width: 500 });

    servicesMeta[svc.code] = {
      code: svc.code,
      name: svc.name,
      qrUrl: `/qr/services/${fileName}`,
    };

    console.log(`📦 Service QR created: ${fileName}`);
  }

  await db.ref("services").set(servicesMeta);

  console.log("✅ QR untuk Lunch, Souvenir, dan Check-In selesai dibuat");
}


// Run
main().catch(console.error);
