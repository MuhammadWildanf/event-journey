import {
    db
} from "../server.js";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import {
    fileURLToPath
} from "url";
import {
    Parser
} from "json2csv";

// untuk path file QR
const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);


function slug(str) {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
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

    res.render("admin/booths/index", {
        booths
    });
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
    const {
        name
    } = req.body;
    if (!name) return res.send("Nama booth wajib!");

    const key = slug(name); // general_services
    const fileName = fileNameSafe(name) + ".png"; // general-services.png

    const qrDir = path.join(__dirname, "../qr/booths");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, {
        recursive: true
    });

    const qrPath = path.join(qrDir, fileName);

    // QR payload = key
    await QRCode.toFile(qrPath, key, {
        width: 500
    });

    await db.ref("booths/" + key).set({
        key,
        name,
        code: key,
        qrPayload: key,
        qrUrl: `/qr/booths/${fileName}`,
    });

    res.redirect("/admin/booths");
};



/* =====================================================
    ✏ FORM EDIT BOOTH
===================================================== */
export const boothEditForm = async (req, res) => {
    const {
        id
    } = req.params;

    const snap = await db.ref("booths/" + id).get();
    if (!snap.exists()) return res.send("Booth tidak ditemukan");

    res.render("admin/booths/edit", {
        id,
        data: snap.val()
    });
};



export const boothUpdate = async (req, res) => {
    const {
        id
    } = req.params; // old key
    const {
        name
    } = req.body;

    const newKey = slug(name);
    const newFileName = fileNameSafe(name) + ".png";

    const qrDir = path.join(__dirname, "../qr/booths");

    // OLD QR
    const oldFile = path.join(qrDir, fileNameSafe(id) + ".png");
    if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);

    // GENERATE NEW QR
    const newFile = path.join(qrDir, newFileName);
    await QRCode.toFile(newFile, newKey, {
        width: 500
    });

    const boothRef = db.ref("booths");
    const oldSnap = await boothRef.child(id).get();

    if (!oldSnap.exists()) return res.send("Booth tidak ditemukan");

    const oldData = oldSnap.val();

    // Remove old key
    await boothRef.child(id).remove();

    // Create new updated booth
    await boothRef.child(newKey).set({
        ...oldData,
        key: newKey,
        name,
        code: newKey,
        qrPayload: newKey,
        qrUrl: `/qr/booths/${newFileName}`
    });

    res.redirect("/admin/booths");
};



/* =====================================================
    ❌ DELETE BOOTH + DELETE QR FILE
===================================================== */
export const boothDelete = async (req, res) => {
    const {
        id
    } = req.params;

    const file = path.join(__dirname, "../qr/booths/" + fileNameSafe(id) + ".png");
    if (fs.existsSync(file)) fs.unlinkSync(file);

    await db.ref("booths/" + id).remove();
    await db.ref("reviews/" + id).remove();

    res.redirect("/admin/booths");
};


/* =====================================================
    📄 DETAIL BOOTH (Visited + Review)
===================================================== */
export const boothDetail = async (req, res) => {
    const {
        id
    } = req.params;

    const boothSnap = await db.ref("booths/" + id).get();
    const booth = boothSnap.exists() ? boothSnap.val() : {};

    const reviewSnap = await db.ref("reviews/" + id).get();
    const reviews = reviewSnap.exists() ? Object.values(reviewSnap.val()) : [];

    const usersSnap = await db.ref("users").get();
    const users = usersSnap.exists() ? usersSnap.val() : {};

    const visitedUsers = Object.entries(users)
        .filter(([uid, u]) => u.booths_visited && u.booths_visited[id])
        .map(([uid, u]) => ({
            id: uid,
            ...u
        }));

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
    const {
        id
    } = req.params;
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

    res.render("admin/users/index", {
        users
    });
};


/* =====================================================
    👤 USER DETAIL
===================================================== */
export const userDetail = async (req, res) => {
    const {
        id
    } = req.params;

    const userSnap = await db.ref("users/" + id).get();
    if (!userSnap.exists()) return res.send("User tidak ditemukan");

    const userData = userSnap.val();

    // ambil semua booth untuk mapping key → nama
    const boothSnap = await db.ref("booths").get();
    const booths = boothSnap.exists() ? boothSnap.val() : {};

    res.render("admin/users/detail", {
        id,
        user: userData,
        booths
    });
};



/* =====================================================
    ✏ UPDATE USER
===================================================== */
export const userUpdate = async (req, res) => {
    const {
        id
    } = req.params;
    const {
        name,
        email
    } = req.body;

    await db.ref("users/" + id).update({
        name,
        email
    });

    res.redirect("/admin/users/" + id);
};



/* =====================================================
    ❌ DELETE USER
===================================================== */
export const userDelete = async (req, res) => {
    const {
        id
    } = req.params;

    await db.ref("users/" + id).remove();

    res.redirect("/admin/users");
};


/* =====================================================
    📤 EXPORT USER → CSV
===================================================== */
export const userExportCSV = async (req, res) => {
    const snap = await db.ref("users").get();
    const users = snap.exists() ? snap.val() : {};

    const rows = Object.entries(users).map(([id, u]) => {
        const visitedCount = u.visited_count || (u.booths_visited ? Object.keys(u.booths_visited).length : 0);
        const lunchClaimed = u.lunch_claimed_dates && Object.keys(u.lunch_claimed_dates).length > 0;
        const souvenirClaimed = u.souvenir_claimed_dates && Object.keys(u.souvenir_claimed_dates).length > 0;

        return {
            id,
            name: u.name,
            email: u.email,
            visited_count: visitedCount,
            lunch_claimed: lunchClaimed,
            souvenir_claimed: souvenirClaimed,
            games_done: !!u.games_done,
            reward_ready: !!u.reward_ready,
        };
    });

    const parser = new Parser();
    const csv = parser.parse(rows);

    res.setHeader("Content-Disposition", "attachment; filename=users.csv");
    res.send(csv);
};



export const userReset = async (req, res) => {
    const {
        id
    } = req.params;

    const resetData = {
        booths_visited: null,
        visited_count: 0,
        checkin_dates: null,
        checkin_order: null,
        lunch_claimed_dates: null,
        souvenir_claimed_dates: null,
        games_done: false,
        photobooth_done: false,
        photobooth_images: null,
        reward_ready: false,
        reward_claimed: false,
    };

    await db.ref("users/" + id).update(resetData);

    res.redirect("/admin/users/" + id);
};



export const userUpdateStatus = async (req, res) => {
    const { id } = req.params;
    const { lunch_claimed, souvenir_claimed, photobooth_done, games_done } = req.body;

    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const userRef = db.ref("users/" + id);
    const updates = {};

    // Lunch
    if (lunch_claimed === "true") {
        updates[`lunch_claimed_dates/${today}`] = true;
    } else {
        updates["lunch_claimed_dates"] = null; // clear semua
    }

    // Souvenir
    if (souvenir_claimed === "true") {
        updates[`souvenir_claimed_dates/${today}`] = true;
    } else {
        updates["souvenir_claimed_dates"] = null;
    }

    // Photobooth & Games
    updates.photobooth_done = photobooth_done === "true";
    updates.games_done = games_done === "true";

    // Recompute visited_count + reward_ready dari booths_visited
    const visitedSnap = await userRef.child("booths_visited").get();
    const visitedCount = visitedSnap.exists()
        ? Object.keys(visitedSnap.val()).length
        : 0;

    updates.visited_count = visitedCount;
    updates.reward_ready = visitedCount >= 5;

    await userRef.update(updates);

    res.redirect("/admin/users/" + id);
};



export const quotaSettings = async (req, res) => {
    const today = new Date().toISOString().slice(0, 10);

    const [lunchQuotaSnap, souvenirQuotaSnap, lunchTodaySnap, souvenirTodaySnap] = await Promise.all([
        db.ref("services/lunch/QUOTA").get(),
        db.ref("services/souvenir/QUOTA").get(),
        db.ref(`services/lunch/today_count/${today}`).get(),
        db.ref(`services/souvenir/today_count/${today}`).get(),
    ]);

    const lunchQuota = lunchQuotaSnap.val() || 300;
    const souvenirQuota = souvenirQuotaSnap.val() || 150;
    const lunchUsed = lunchTodaySnap.val() || 0;
    const souvenirUsed = souvenirTodaySnap.val() || 0;

    res.render("admin/quota/index", {
        lunchQuota,
        lunchUsed,
        lunchRemaining: lunchQuota - lunchUsed,

        souvenirQuota,
        souvenirUsed,
        souvenirRemaining: souvenirQuota - souvenirUsed,
    });
};



/* =====================================================
    ✔ UPDATE QUOTA
===================================================== */
export const quotaUpdate = async (req, res) => {
    const { lunchQuota, souvenirQuota } = req.body;

    await db.ref("services/lunch/QUOTA").set(Number(lunchQuota));
    await db.ref("services/souvenir/QUOTA").set(Number(souvenirQuota));

    res.redirect("/admin/quota");
};
