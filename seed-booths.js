import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import QRCode from "qrcode";
import admin from "firebase-admin";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔹 Inisialisasi Firebase pakai ENV, bukan JSON file
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

async function main() {
  const boothCount = 5;
  const outDir = path.join(__dirname, "qr", "booths");
  await fs.mkdir(outDir, { recursive: true });

  const booths = {};
  for (let i = 1; i <= boothCount; i++) {
    const code = `BOOTH-${i}`;
    const name = `Booth ${i}`;
    const pngPath = path.join(outDir, `${code}.png`);
    await QRCode.toFile(pngPath, code, { width: 400 });
    booths[code] = { name, qrUrl: `/qr/booths/${code}.png` };
  }

  await db.ref("booths").set(booths);
  console.log(`✅ Seeded ${boothCount} booths & generated QR images`);
}

main().catch(console.error);
