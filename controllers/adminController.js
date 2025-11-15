import { db } from "../server.js";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Parser } from "json2csv";

// untuk path file QR
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


/* =====================================================
    🏠 ADMIN DASHBOARD
===================================================== */
export const adminDashboard = async (req, res) => {
    const userSnap = await db.ref("users").get();
    const users = userSnap.exists() ? Object.values(userSnap.val()) : [];

    const boothSnap = await db.ref("booths").get();
    const booths = boothSnap.exists() ? boothSnap.val() : {};

    res.render("admin/dashboard", {
        userCount: users.length,
        boothCount: Object.keys(booths).length,
    });
};


/* =====================================================
    📌 LIST SEMUA BOOTH
===================================================== */
export const boothList = async (req, res) => {
    const snap = await db.ref("booths").get();
    const booths = snap.exists() ? snap.val() : {};

    res.render("admin/booths/index", { booths });
};


/* =====================================================
    ➕ FORM CREATE BOOTH
===================================================== */
export const boothCreateForm = (req, res) => {
    res.render("admin/booths/create");
};


/* =====================================================
    ✔ CREATE BOOTH + QR
===================================================== */
export const boothCreate = async (req, res) => {
    const { name } = req.body;
    if (!name) return res.send("Nama booth wajib!");

    const id = name.replace(/\s+/g, "-").toUpperCase(); // BOOTH-NAME
    const code = id;

    // Folder QR
    const outDir = path.join(__dirname, "../qr/booths");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const qrPath = `${outDir}/${code}.png`;

    await QRCode.toFile(qrPath, code, { width: 400 });

    await db.ref("booths/" + code).set({
        name,
        qrUrl: `/qr/booths/${code}.png`,
    });

    res.redirect("/admin/booths");
};


/* =====================================================
    ✏ FORM EDIT BOOTH
===================================================== */
export const boothEditForm = async (req, res) => {
    const { id } = req.params;
    const snap = await db.ref("booths/" + id).get();
    if (!snap.exists()) return res.send("Booth tidak ditemukan");

    res.render("admin/booths/edit", { id, data: snap.val() });
};


/* =====================================================
    ✔ UPDATE BOOTH (tanpa buat QR baru)
===================================================== */
export const boothUpdate = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    await db.ref("booths/" + id).update({ name });

    res.redirect("/admin/booths");
};


/* =====================================================
    ❌ DELETE BOOTH + DELETE QR FILE
===================================================== */
export const boothDelete = async (req, res) => {
    const { id } = req.params;

    // Hapus QR
    const qrFile = path.join(__dirname, "../qr/booths/" + id + ".png");
    if (fs.existsSync(qrFile)) fs.unlinkSync(qrFile);

    // Hapus booth di Firebase
    await db.ref("booths/" + id).remove();

    // Hapus review
    await db.ref("reviews/" + id).remove();

    res.redirect("/admin/booths");
};


/* =====================================================
    📄 DETAIL BOOTH (Visited + Review)
===================================================== */
export const boothDetail = async (req, res) => {
    const { id } = req.params;

    const boothSnap = await db.ref("booths/" + id).get();
    const booth = boothSnap.exists() ? boothSnap.val() : {};

    // Review
    const reviewSnap = await db.ref("reviews/" + id).get();
    const reviews = reviewSnap.exists() ? Object.values(reviewSnap.val()) : [];

    // User visited
    const usersSnap = await db.ref("users").get();
    const users = usersSnap.exists() ? usersSnap.val() : {};

    const visitedUsers = Object.entries(users)
        .filter(([uid, u]) => u.booths_visited && u.booths_visited[id])
        .map(([uid, u]) => ({ id: uid, ...u }));

    res.render("admin/booths/detail", {
        id,
        booth,
        reviews,
        visitedUsers
    });
};


/* =====================================================
    📥 DOWNLOAD QR
===================================================== */
export const boothDownloadQR = (req, res) => {
    const { id } = req.params;
    const file = path.join(__dirname, `../qr/booths/${id}.png`);

    if (!fs.existsSync(file)) return res.send("QR tidak ditemukan");

    res.download(file);
};


/* =====================================================
    📤 EXPORT BOOTH → CSV
===================================================== */
export const boothExportCSV = async (req, res) => {
    const snap = await db.ref("booths").get();
    const booths = snap.exists() ? snap.val() : {};

    const rows = Object.entries(booths).map(([key, b]) => ({
        id: key,
        name: b.name,
        qrUrl: b.qrUrl,
    }));

    const parser = new Parser();
    const csv = parser.parse(rows);

    res.setHeader("Content-Disposition", "attachment; filename=booths.csv");
    res.send(csv);
};


/* =====================================================
    👥 USER LIST
===================================================== */
export const userList = async (req, res) => {
    const snap = await db.ref("users").get();
    const users = snap.exists() ? snap.val() : {};

    res.render("admin/users/index", { users });
};


/* =====================================================
    👤 USER DETAIL
===================================================== */
export const userDetail = async (req, res) => {
    const { id } = req.params;

    const snap = await db.ref("users/" + id).get();
    if (!snap.exists()) return res.send("User tidak ditemukan");

    const data = snap.val();

    res.render("admin/users/detail", {
        id,
        user: data
    });
};


/* =====================================================
    ✏ UPDATE USER
===================================================== */
export const userUpdate = async (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body;

    await db.ref("users/" + id).update({ name, email });

    res.redirect("/admin/users/" + id);
};


/* =====================================================
    ❌ DELETE USER
===================================================== */
export const userDelete = async (req, res) => {
    const { id } = req.params;

    await db.ref("users/" + id).remove();

    res.redirect("/admin/users");
};


/* =====================================================
    📤 EXPORT USER → CSV
===================================================== */
export const userExportCSV = async (req, res) => {
    const snap = await db.ref("users").get();
    const users = snap.exists() ? snap.val() : {};

    const rows = Object.entries(users).map(([id, u]) => ({
        id,
        name: u.name,
        email: u.email,
        lunch_claimed: u.lunch_claimed || false,
        souvenir_claimed: u.souvenir_claimed || false,
        visited_count: u.visited_count || 0,
    }));

    const parser = new Parser();
    const csv = parser.parse(rows);

    res.setHeader("Content-Disposition", "attachment; filename=users.csv");
    res.send(csv);
};
