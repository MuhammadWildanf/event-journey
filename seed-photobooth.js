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
        .normalize("NFD")                     // hilangkan karakter aneh
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
       1. GENERATE PHOTBOOTH QR
    ======================================================= */

    const photoboothDir = path.join(__dirname, "qr", "services", "photobooth");
    await fs.mkdir(photoboothDir, { recursive: true });

    const photoboothMeta = {};

    // Untuk photobooth, QR code mengandung userId (seperti userId=OeHWPudkQRivP8dXLI8)
    const userId = "<userId>";  // Ini bisa Anda isi dinamis saat generate QR code

    // URL photobooth untuk QR Code
    const photoboothUrl = `https://scmdigitalday2025.com/photobooth?userId=${userId}`;

    const fileName = "photobooth.png";
    const filePath = path.join(photoboothDir, fileName);

    // Generate QR code dengan userId di dalam URL
    await QRCode.toFile(filePath, photoboothUrl, { width: 500 });

    // Menyimpan informasi QR ke Firebase
    photoboothMeta["photobooth"] = {
        code: "photobooth",
        name: "Photobooth",
        qrUrl: `/qr/services/photobooth/${fileName}`,
    };

    console.log(`📸 Photobooth QR created: ${fileName}`);

    // Update ke Firebase
    await db.ref("services").update(photoboothMeta);

    console.log("✅ QR untuk Photobooth selesai dibuat");
}

// Jalankan
main().catch(console.error);
