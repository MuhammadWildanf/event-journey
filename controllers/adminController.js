import {
    db
} from "../config/firebase.js";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import {
    fileURLToPath
} from "url";
import {
    Parser
} from "json2csv";
import moment from "moment-timezone";
import ExcelJS from "exceljs";
import {
    sendEmail
} from "../utils/mailer.js";

moment.locale("id");

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


function formatTanggalIndo(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);
    if (isNaN(date)) return dateString;

    const options = {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    };

    return new Intl.DateTimeFormat("id-ID", options).format(date);
}




export const exportUsersCleanExcel = async (req, res) => {
    const snap = await db.ref("users").get();
    const users = snap.val() || {};

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Users Clean");

    sheet.columns = [{
            header: "No",
            key: "no",
            width: 8
        },
        {
            header: "Name",
            key: "name",
            width: 25
        },
        {
            header: "Email",
            key: "email",
            width: 30
        },
        {
            header: "Created At",
            key: "created_at",
            width: 30
        },
        {
            header: "Checkin Dates",
            key: "checkin_dates",
            width: 25
        },
        {
            header: "Lunch Claimed Dates",
            key: "lunch_claimed_dates",
            width: 25
        },
        {
            header: "Games Done",
            key: "games_done",
            width: 25
        },
        {
            header: "Souvenir",
            key: "souvenir_claimed",
            width: 20
        },
        {
            header: "Visited Count",
            key: "visited_count",
            width: 15
        }
    ];

    function formatTanggalIndo(dateString) {
        if (!dateString) return "";
        const date = new Date(dateString);
        if (isNaN(date)) return dateString;

        const opts = {
            timeZone: "Asia/Jakarta",
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        };
        return new Intl.DateTimeFormat("id-ID", opts).format(date);
    }

    let no = 1;

    for (const uid in users) {
        const u = users[uid];

        // ---- CHECKIN DATES ----
        const checkinDates = u.checkin_dates ?
            Object.keys(u.checkin_dates).join(", ") :
            "Tidak ada";

        // ---- LUNCH CLAIMED DATES ----
        let lunchDates = "Belum pernah ambil";
        if (u.lunch_claimed_dates) {
            const list = Object.entries(u.lunch_claimed_dates)
                .filter(([_, v]) => v === true)
                .map(([date]) => date);

            if (list.length > 0) lunchDates = list.join(", ");
        }

        // ---- GAMES DONE ----
        let gamesDone = "Belum main";
        if (u.games_done) {
            const list = Object.entries(u.games_done)
                .filter(([_, v]) => v === true)
                .map(([game]) => game);

            if (list.length > 0) gamesDone = list.join(", ");
        }

        // ---- SOUVENIR ----
        const souvenirStatus = u.souvenir_claimed ? "Sudah ambil" : "Belum";

        sheet.addRow({
            no: no++,
            name: u.name || "",
            email: u.email || "",
            created_at: formatTanggalIndo(u.created_at),
            checkin_dates: checkinDates,
            lunch_claimed_dates: lunchDates,
            games_done: gamesDone,
            souvenir_claimed: souvenirStatus,
            visited_count: u.visited_count ??0
        });
    }

    res.setHeader("Content-Disposition", "attachment; filename=users-clean.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    await workbook.xlsx.write(res);
    res.end();
};




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
    📌 LIST SEMUA BOOTH BERDASARKAN RATING (TINGGI → RENDAH)
===================================================== */
export const boothListByRating = async (req, res) => {
    const boothsSnap = await db.ref("booths").get();
    const booths = boothsSnap.exists() ? boothsSnap.val() : {};

    const reviewsSnap = await db.ref("reviews").get();
    const allReviews = reviewsSnap.exists() ? reviewsSnap.val() : {};

    // Buat array booth dengan rating
    const boothsWithRating = Object.entries(booths).map(([key, booth]) => {
        const boothReviews = allReviews[key] ? Object.values(allReviews[key]) : [];

        // Hitung average rating
        let averageRating = 0;
        if (boothReviews.length > 0) {
            const total = boothReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
            averageRating = total / boothReviews.length;
        }

        // Distribusi rating (1-5)
        const ratingDistribution = {
            5: boothReviews.filter(r => Number(r.rating) === 5).length,
            4: boothReviews.filter(r => Number(r.rating) === 4).length,
            3: boothReviews.filter(r => Number(r.rating) === 3).length,
            2: boothReviews.filter(r => Number(r.rating) === 2).length,
            1: boothReviews.filter(r => Number(r.rating) === 1).length,
        };

        return {
            ...booth,
            key,
            averageRating: Number(averageRating.toFixed(2)),
            totalReviews: boothReviews.length,
            ratingDistribution
        };
    });

    // Urutkan dari rating tertinggi → terendah
    boothsWithRating.sort((a, b) => b.averageRating - a.averageRating);

    res.render("admin/booths/list-by-rating", {
        booths: boothsWithRating
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
    📄 DETAIL BOOTH (Visited + Review + Report)
===================================================== */
export const boothDetail = async (req, res) => {
    const {
        id
    } = req.params;

    const boothSnap = await db.ref("booths/" + id).get();
    const booth = boothSnap.exists() ? boothSnap.val() : {};

    const reviewSnap = await db.ref("reviews/" + id).get();
    const reviewsRaw = reviewSnap.exists() ? reviewSnap.val() : {};
    const reviews = Object.values(reviewsRaw);

    // Hitung rata-rata rating
    let averageRating = 0;
    if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
        averageRating = (totalRating / reviews.length).toFixed(2);
    }

    // Distribusi rating (1-5)
    const ratingDistribution = {
        5: reviews.filter(r => Number(r.rating) === 5).length,
        4: reviews.filter(r => Number(r.rating) === 4).length,
        3: reviews.filter(r => Number(r.rating) === 3).length,
        2: reviews.filter(r => Number(r.rating) === 2).length,
        1: reviews.filter(r => Number(r.rating) === 1).length,
    };

    const usersSnap = await db.ref("users").get();
    const users = usersSnap.exists() ? usersSnap.val() : {};

    const visitedUsers = Object.entries(users)
        .filter(([uid, u]) => u.booths_visited && u.booths_visited[id])
        .map(([uid, u]) => ({
            id: uid,
            ...u
        }));

    // Sort reviews by created_at (newest first)
    const sortedReviews = reviews.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : 0;
        const dateB = b.created_at ? new Date(b.created_at) : 0;
        return dateB - dateA;
    });

    res.render("admin/booths/detail", {
        id,
        booth,
        reviews: sortedReviews,
        visitedUsers,
        totalVisitors: visitedUsers.length,
        totalReviews: reviews.length,
        averageRating,
        ratingDistribution
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
    const usersRaw = snap.exists() ? snap.val() : {};

    const users = Object.entries(usersRaw)
        .map(([id, u]) => {
            const createdAt = u.created_at ?
                moment(u.created_at).tz("Asia/Jakarta").format("DD MMMM YYYY HH:mm") :
                "-";

            return {
                id,
                ...u,
                createdAtFormatted: createdAt
            };
        })
        .sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at) : 0;
            const dateB = b.created_at ? new Date(b.created_at) : 0;
            return dateB - dateA;
        });

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
    🔑 UPDATE USER PASSWORD
===================================================== */
export const userUpdatePassword = async (req, res) => {
    const {
        id
    } = req.params;
    const {
        password
    } = req.body;

    if (!password) {
        return res.status(400).send("Password is required!");
    }

    // Validasi password sama seperti register
    if (password.length < 6) {
        return res.status(400).send("Password must be at least 6 characters!");
    }

    if (password.length > 32) {
        return res.status(400).send("Password must be at most 32 characters!");
    }

    await db.ref("users/" + id).update({
        password
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

    // Ambil tanggal hari ini (WIB)
    const today = moment().tz("Asia/Jakarta").format("YYYY-MM-DD");

    // Filter user berdasarkan created_at
    const filtered = Object.entries(users)
        .filter(([id, u]) => {
            if (!u.created_at) return false;

            const created = moment(u.created_at)
                .tz("Asia/Jakarta")
                .format("YYYY-MM-DD");

            return created === today;
        })
        .map(([id, u], index) => {
            const createdAtFormatted = moment(u.created_at)
                .tz("Asia/Jakarta")
                .format("DD MMMM YYYY HH:mm");

            return {
                no: index + 1,
                name: u.name || "-",
                email: u.email || "-",
                created_at: createdAtFormatted
            };
        });

    // Format waktu export
    const exportTime = moment()
        .tz("Asia/Jakarta")
        .format("YYYY-MM-DD_HH-mm-ss");

    // Generate nama file
    const filename = `users_today_${exportTime}.csv`;

    const parser = new Parser();
    const csv = parser.parse(filtered);

    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.set("Content-Type", "text/csv; charset=utf-8");
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


/* =====================================================
    🎁 RESET DOORPRIZE STATUS
===================================================== */
export const userResetDoorprize = async (req, res) => {
    const {
        id
    } = req.params;

    await db.ref("users/" + id).update({
        doorprize_joined: false
    });

    res.redirect("/admin/users");
};


export const userUpdateStatus = async (req, res) => {
    const {
        id
    } = req.params;
    const {
        lunch_claimed,
        souvenir_claimed,
        photobooth_done,
        games_done
    } = req.body;

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
    const visitedCount = visitedSnap.exists() ?
        Object.keys(visitedSnap.val()).length :
        0;

    updates.visited_count = visitedCount;
    updates.reward_ready = visitedCount >= 8; // Updated to match souvenir requirement

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

    const lunchQuota = Number(lunchQuotaSnap.val()) || 0;
    const souvenirQuota = Number(souvenirQuotaSnap.val()) || 0;

    const lunchUsed = Number(lunchTodaySnap.val()) || 0;
    const souvenirUsed = Number(souvenirTodaySnap.val()) || 0;

    res.render("admin/quota/index", {
        lunchQuota,
        lunchUsed,
        lunchRemaining: Math.max(lunchQuota - lunchUsed, 0),

        souvenirQuota,
        souvenirUsed,
        souvenirRemaining: Math.max(souvenirQuota - souvenirUsed, 0),
    });
};


/* =====================================================
    ✔ UPDATE QUOTA
===================================================== */
export const quotaUpdate = async (req, res) => {
    const {
        lunchQuota,
        souvenirQuota
    } = req.body;

    await db.ref("services/lunch/QUOTA").set(Number(lunchQuota));
    await db.ref("services/souvenir/QUOTA").set(Number(souvenirQuota));

    res.redirect("/admin/quota");
};


export const quotaLunchDetail = async (req, res) => {
    const [quotaSnap, todayCountSnap, usersSnap] = await Promise.all([
        db.ref("services/lunch/QUOTA").get(),
        db.ref("services/lunch/today_count").get(),
        db.ref("users").get()
    ]);

    const quota = Number(quotaSnap.val()) || 0;
    const todayCount = todayCountSnap.val() || {};
    const used = Object.values(todayCount).reduce((a, b) => a + Number(b), 0);

    const users = usersSnap.val() || {};

    // Cari user yang memiliki lunch_claimed_dates
    const lunchUsers = Object.entries(users)
        .flatMap(([uid, u]) => {
            if (!u.lunch_claimed_dates) return [];

            return Object.keys(u.lunch_claimed_dates).map(date => ({
                id: uid,
                date,
                name: u.name || "-",
                email: u.email || "-",
                phone: u.phone || "-"
            }));
        });

    res.render("admin/quota/lunch-detail", {
        quota,
        used,
        remaining: quota - used,
        lunchUsers
    });
};


export const quotaSouvenirDetail = async (req, res) => {
    const [quotaSnap, todayCountSnap, usersSnap] = await Promise.all([
        db.ref("services/souvenir/QUOTA").get(),
        db.ref("services/souvenir/today_count").get(),
        db.ref("users").get()
    ]);

    const quota = Number(quotaSnap.val()) || 0;
    const todayCount = todayCountSnap.val() || {};
    const used = Object.values(todayCount).reduce((a, b) => a + Number(b), 0);

    const users = usersSnap.val() || {};

    const souvenirUsers = Object.entries(users)
        .flatMap(([uid, u]) => {
            if (!u.souvenir_claimed_dates) return [];

            return Object.keys(u.souvenir_claimed_dates).map(date => ({
                id: uid,
                date,
                name: u.name || "-",
                email: u.email || "-",
                phone: u.phone || "-"
            }));
        });

    res.render("admin/quota/souvenir-detail", {
        quota,
        used,
        remaining: quota - used,
        souvenirUsers
    });
};



/* =====================================================
    📦 LIST SEMUA SERVICE
===================================================== */
export const serviceList = async (req, res) => {
    const snap = await db.ref("services").get();
    const services = snap.exists() ? snap.val() : {};

    res.render("admin/services/index", {
        services
    });
};


/* =====================================================
    ➕ FORM CREATE SERVICE
===================================================== */
export const serviceCreateForm = (req, res) => {
    res.render("admin/services/create");
};


/* =====================================================
    ✔ CREATE SERVICE + QR
===================================================== */
export const serviceCreate = async (req, res) => {
    const {
        name,
        code
    } = req.body;

    if (!name || !code) return res.send("Nama & Code wajib!");

    const key = slug(code);
    const fileName = fileNameSafe(key) + ".png";

    const qrDir = path.join(__dirname, "../qr/services");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, {
        recursive: true
    });

    const qrPath = path.join(qrDir, fileName);

    // Generate QR dengan payload = key
    await QRCode.toFile(qrPath, key, {
        width: 500
    });

    await db.ref("services/" + key).set({
        code: key,
        name,
        qrUrl: `/qr/services/${fileName}`,
    });

    res.redirect("/admin/services");
};


/* =====================================================
    ✏ FORM EDIT SERVICE
===================================================== */
export const serviceEditForm = async (req, res) => {
    const {
        id
    } = req.params;

    const snap = await db.ref("services/" + id).get();
    if (!snap.exists()) return res.send("Service tidak ditemukan");

    res.render("admin/services/edit", {
        id,
        data: snap.val()
    });
};


/* =====================================================
    ✔ UPDATE SERVICE + REGENERATE QR
===================================================== */
export const serviceUpdate = async (req, res) => {
    const {
        id
    } = req.params; // old code
    const {
        name,
        code
    } = req.body;

    const newKey = slug(code);
    const newFileName = fileNameSafe(newKey) + ".png";

    const qrDir = path.join(__dirname, "../qr/services");

    // Hapus QR lama
    const oldFile = path.join(qrDir, fileNameSafe(id) + ".png");
    if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);

    // Generate QR baru
    const newFile = path.join(qrDir, newFileName);
    await QRCode.toFile(newFile, newKey, {
        width: 500
    });

    const serviceRef = db.ref("services");
    const oldSnap = await serviceRef.child(id).get();
    if (!oldSnap.exists()) return res.send("Service tidak ditemukan");

    const oldData = oldSnap.val();

    // Hapus key lama
    await serviceRef.child(id).remove();

    // Simpan key baru
    await serviceRef.child(newKey).set({
        ...oldData,
        code: newKey,
        name,
        qrUrl: `/qr/services/${newFileName}`,
    });

    res.redirect("/admin/services");
};


/* =====================================================
    ❌ DELETE SERVICE + QR FILE
===================================================== */
export const serviceDelete = async (req, res) => {
    const {
        id
    } = req.params;

    const file = path.join(__dirname, "../qr/services/" + fileNameSafe(id) + ".png");
    if (fs.existsSync(file)) fs.unlinkSync(file);

    await db.ref("services/" + id).remove();

    res.redirect("/admin/services");
};


/* =====================================================
    🏆 DOORPRIZE WINNERS
===================================================== */
export const doorprizeWinners = async (req, res) => {
    const winnersSnap = await db.ref("doorprize_winners").get();
    const winners = winnersSnap.exists() ? winnersSnap.val() : {};

    // Convert to array and sort by wonAt (newest first)
    const winnersList = Object.entries(winners)
        .map(([id, winner]) => ({
            id,
            name: winner.name || "Unknown",
            email: winner.email || "",
            userId: winner.userId || id,
            timestamp: winner.timestamp || null,
            wonAt: winner.wonAt || winner.timestamp || Date.now()
        }))
        .sort((a, b) => b.wonAt - a.wonAt); // Sort by wonAt descending

    res.render("admin/doorprize-winners", {
        winners: winnersList,
        totalWinners: winnersList.length
    });
};


/* =====================================================
    ⚙️ DOORPRIZE SETTINGS
===================================================== */
export const doorprizeSettings = async (req, res) => {
    const settingsSnap = await db.ref("doorprize_settings").get();
    const settings = settingsSnap.exists() ? settingsSnap.val() : {};

    res.render("admin/doorprize-settings", {
        spinDuration: settings.spin_duration || 5
    });
};

export const doorprizeSettingsUpdate = async (req, res) => {
    const {
        spinDuration
    } = req.body;

    // Validate spin duration (2-30 seconds)
    const duration = Math.max(2, Math.min(30, parseFloat(spinDuration) || 5));

    await db.ref("doorprize_settings").update({
        spin_duration: duration
    });

    res.redirect("/admin/doorprize/settings");
};


/* =====================================================
    🏆 GRANDPRIZE WINNERS
===================================================== */
export const grandprizeWinners = async (req, res) => {
    const winnersSnap = await db.ref("grandprize_winners").get();
    const winners = winnersSnap.exists() ? winnersSnap.val() : {};

    const winnersList = Object.entries(winners)
        .map(([id, winner]) => ({
            id,
            name: winner.name || "Unknown",
            email: winner.email || "",
            userId: winner.userId || id,
            timestamp: winner.timestamp || null,
            wonAt: winner.wonAt || winner.timestamp || Date.now()
        }))
        .sort((a, b) => b.wonAt - a.wonAt); // newest first

    res.render("admin/grandprize-winners", {
        winners: winnersList,
        totalWinners: winnersList.length
    });
};

/* =====================================================
    ⚙️ GRANDPRIZE SETTINGS
===================================================== */
export const grandprizeSettings = async (req, res) => {
    const settingsSnap = await db.ref("grandprize_settings").get();
    const settings = settingsSnap.exists() ? settingsSnap.val() : {};

    res.render("admin/grandprize-settings", {
        spinDuration: settings.spin_duration || 5
    });
};

export const grandprizeSettingsUpdate = async (req, res) => {
    const { spinDuration } = req.body;
    const duration = Math.max(2, Math.min(30, parseFloat(spinDuration) || 5));

    await db.ref("grandprize_settings").update({
        spin_duration: duration
    });

    res.redirect("/admin/grandprize/settings");
};

/* =====================================================
    ❌ RESET ALL DOORPRIZE & GRANDPRIZE DATA
===================================================== */
export const resetAllPrizes = async (req, res) => {
    // Reset doorprize
    const usersSnap = await db.ref("users").get();
    const users = usersSnap.val() || {};

    for (const uid in users) {
        await db.ref("users/" + uid).update({
            doorprize_joined: false,
            grandprize_joined: false // optional, jika ada field user untuk grandprize
        });
    }

    await db.ref("doorprize_winners").remove();
    await db.ref("grandprize_winners").remove();

    res.send("Semua data doorprize & grandprize telah di-reset");
};



export const checkVisited = async (req, res) => {
    const snap = await db.ref("users").get();
    const users = snap.val() || {};

    const yesList = [];
    const noList = [];

    for (const uid in users) {
        const u = users[uid];
        const visitedCount = u.visited_count ??0;

        if (visitedCount >= 8) {
            const data = {
                id: uid,
                name: u.name || "-",
                email: u.email || "-",
                visitedCount,
                souvenir_claimed: u.souvenir_claimed === true ? "YES" : "NO"
            };

            if (u.souvenir_claimed === true) yesList.push(data);
            else noList.push(data);
        }
    }

    res.render("admin/cekvisited", {
        results: [...yesList, ...noList] // ⬅ FIX
    });
};


export const checkVisitedReview = async (req, res) => {
    const userSnap = await db.ref("users").get();
    const users = userSnap.val() || {};

    const reviewSnap = await db.ref("reviews").get();
    const reviews = reviewSnap.val() || {};

    const results = [];

    for (const uid in users) {
        const u = users[uid];

        if ((u.visited_count ??0) < 8) continue;
        if (u.souvenir_claimed === true) continue;

        let earliestReview = null;

        const visitedBooths = u.booths_visited || {};

        for (const boothId in reviews) {

            // hanya booth yang dikunjungi user
            if (!visitedBooths[boothId]) continue;

            const boothReviews = reviews[boothId];

            for (const revId in boothReviews) {
                const r = boothReviews[revId];

                // hanya review milik user
                if (r.userId !== uid) continue;

                if (!earliestReview || new Date(r.created_at) < new Date(earliestReview.created_at)) {
                    earliestReview = r;
                }
            }
        }

        results.push({
            id: uid,
            name: u.name || "-",
            email: u.email || "-",
            visitedCount: u.visited_count ??0,
            souvenir_claimed: "NO",
            review_time: earliestReview ? earliestReview.created_at : null
        });
    }

    // Sort review paling cepat
    results.sort((a, b) => {
        if (!a.review_time) return 1;
        if (!b.review_time) return -1;
        return new Date(a.review_time) - new Date(b.review_time);
    });

    res.render("admin/visited-review", {
        results
    });
};


export const saveEmailTargetsExcel = async (req, res) => {
    const usersSnap = await db.ref("users").get();
    const reviewsSnap = await db.ref("reviews").get();

    const users = usersSnap.val() || {};
    const reviews = reviewsSnap.val() || {};

    const list = [];

    for (const uid in users) {
        const u = users[uid];

        // Syarat utama
        if ((u.visited_count ??0) < 8) continue;
        if (u.souvenir_claimed === true) continue;

        let earliestReview = null;

        // Booth yang dikunjungi user
        const visitedBooths = u.booths_visited || {};

        for (const boothId in reviews) {

            // Hanya booth yang dikunjungi user
            if (!visitedBooths[boothId]) continue;

            const boothReviews = reviews[boothId];

            for (const revId in boothReviews) {
                const r = boothReviews[revId];

                // Hanya review milik user
                if (r.userId !== uid) continue;

                if (!earliestReview ||
                    new Date(r.created_at) < new Date(earliestReview.created_at)) {
                    earliestReview = r;
                }
            }
        }

        list.push({
            uid,
            name: u.name || "-",
            email: u.email || "-",
            review_time: earliestReview ? earliestReview.created_at : null,
        });
    }

    // Urutkan dari review paling awal
    list.sort((a, b) => {
        if (!a.review_time) return 1;
        if (!b.review_time) return -1;
        return new Date(a.review_time) - new Date(b.review_time);
    });

    const top150 = list.slice(0, 150);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Email Targets");

    sheet.columns = [{
            header: "No",
            key: "no",
            width: 8
        },
        {
            header: "Name",
            key: "name",
            width: 30
        },
        {
            header: "Email",
            key: "email",
            width: 30
        },
    ];

    top150.forEach((u, i) => {
        sheet.addRow({
            no: i + 1,
            name: u.name,
            email: u.email,
        });
    });

    res.setHeader(
        "Content-Disposition",
        "attachment; filename=email-targets.xlsx"
    );
    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
};


export const blastEmailSouvenir = async (req, res) => {
    try {
        const usersSnap = await db.ref("users").get();
        const reviewsSnap = await db.ref("reviews").get();

        const users = usersSnap.val() || {};
        const reviews = reviewsSnap.val() || {};

        const list = [];

        for (const uid in users) {
            const u = users[uid];
            if ((u.visited_count ??0) < 8) continue;
            if (u.souvenir_claimed === true) continue;

            let earliestReview = null;
            const visitedBooths = u.booths_visited || {};

            for (const boothId in reviews) {
                if (!visitedBooths[boothId]) continue;
                const boothReviews = reviews[boothId];
                for (const revId in boothReviews) {
                    const r = boothReviews[revId];
                    if (r.userId !== uid) continue;
                    if (!earliestReview || new Date(r.created_at) < new Date(earliestReview.created_at)) {
                        earliestReview = r;
                    }
                }
            }

            list.push({
                uid,
                name: u.name || "-",
                email: u.email || "-",
                review_time: earliestReview ? earliestReview.created_at : null,
            });
        }

        // urutkan berdasarkan review paling cepat
        list.sort((a, b) => {
            if (!a.review_time) return 1;
            if (!b.review_time) return -1;
            return new Date(a.review_time) - new Date(b.review_time);
        });

        const top150 = list.slice(0, 150);
        const sendReport = [];

        // ================================
        // KIRIM EMAIL SATU PER SATU PAKAI sendEmail
        // ================================
        for (const user of top150) {
            const emailBody = `
Dengan Hormat SCM Digital Day 2025 Participants,

Terima kasih telah berpartisipasi dalam SCM Digital Day 2025.

Kami mencatat bahwa Bapak/Ibu (${user.name}) telah melakukan check-in di 8 booth selama acara. Dengan demikian, Bapak/Ibu berhak mendapatkan souvenir.

Silakan mengambil souvenir pada:

📅 Rabu, 26 November 2025
⏰ Pukul 15.00 WIB
📍 Souvenir Desk

Mohon tunjukkan email ini kepada petugas sebagai bukti.

⸻

Terima kasih dan sampai jumpa!
Semoga pengalaman Bapak/Ibu di SCM Digital Day 2025 bermanfaat dan menginspirasi.

Catatan: Batas waktu pengambilan souvenir sampai dengan tanggal 26 November 2025 pukul 16.00 WIB. Panitia berhak menyerahkan souvenir yang tidak diambil kepada peserta lain.

Salam,
SCM Digital Day 2025 Committee
    `;

            const emailSent = await sendEmail(
                user.email,
                "Konfirmasi Check-in & Pengambilan Souvenir – SCM Digital Day 2025",
                emailBody
            );

            sendReport.push({
                email: user.email,
                status: emailSent ? "sent" : "failed"
            });

            // delay untuk hindari spam
            await new Promise(r => setTimeout(r, 300));
        }

        return res.json({
            message: "Blast email selesai",
            totalSent: sendReport.filter(x => x.status === "sent").length,
            report: sendReport
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send("Error blasting emails");
    }
};