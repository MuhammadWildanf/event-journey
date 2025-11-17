import {
    db
} from "../server.js";
import { getToday } from "../utils/date.js";

/* ---------------------------------------
   PAGE VIEW (Lunch, Souvenir, Photobooth, Games)
---------------------------------------- */
export const showLunch = async (req, res) => {
    const user = req.session.user;

    const snap = await db.ref("users/" + user.id).get();
    const userData = snap.exists() ? snap.val() : {};

    res.render("services/lunch", {
        user,
        userData
    });
};

export const showSouvenir = async (req, res) => {
    const user = req.session.user;

    const snap = await db.ref("users/" + user.id).get();
    const userData = snap.exists() ? snap.val() : {};

    res.render("services/souvenir", {
        user,
        userData
    });
};

export const showPhotobooth = (req, res) => {
    res.render("services/photobooth", {
        user: req.session.user
    });
};

export const showGames = (req, res) => {
    res.render("services/games", {
        user: req.session.user
    });
};

/* ---------------------------------------
   🔥 HANDLE LUNCH SCAN
   - QR harus bernilai: "lunch"
   - Lunch hanya untuk 300 pengunjung pertama
---------------------------------------- */
export const handleLunchScan = async (req, res) => {
    try {
        const user = req.session.user;
        const { code } = req.body;
        const today = new Date().toISOString().slice(0, 10);

        if (code !== "lunch") {
            return res.json({ success: false, message: "QR Code lunch tidak valid!" });
        }

        const userRef = db.ref("users/" + user.id);
        const userSnap = await userRef.get();
        const userData = userSnap.val() || {};

        // 1️⃣ Check-in wajib
        if (!userData.checkin_dates?.[today]) {
            return res.json({ success: false, message: "Silakan check-in terlebih dahulu." });
        }

        // 2️⃣ Sudah ambil hari ini?
        if (userData.lunch_claimed_dates?.[today]) {
            return res.json({ success: false, message: "Anda sudah mengambil lunch hari ini." });
        }

        // 3️⃣ Cek kuota harian
        const quotaRef = db.ref(`services/lunch/today_count/${today}`);
        const quotaSnap = await quotaRef.get();
        const countToday = quotaSnap.val() || 0;

        const limitSnap = await db.ref("services/lunch/QUOTA").get();
        const limit = limitSnap.val() || 300;

        if (countToday >= limit) {
            return res.json({ success: false, message: "Lunch box sudah habis hari ini!" });
        }

        // 4️⃣ Berikan lunch
        await userRef.child(`lunch_claimed_dates/${today}`).set(true);

        // 5️⃣ Update counter
        await quotaRef.set(countToday + 1);

        return res.json({
            success: true,
            message: "Lunch berhasil di-claim!",
            redirect: "/lunch-success"
        });

    } catch (err) {
        console.error("Lunch error:", err);
        return res.json({ success: false, message: "Terjadi kesalahan server." });
    }
};



/* ---------------------------------------
   🔥 HANDLE SOUVENIR SCAN
   - QR harus bernilai: "souvenir"
   - Souvenir hanya untuk yang visit ≥ 5 booth
---------------------------------------- */
export const handleSouvenirScan = async (req, res) => {
    try {
        const user = req.session.user;
        const { code } = req.body;
        const today = new Date().toISOString().slice(0, 10);

        if (code !== "souvenir") {
            return res.json({ success: false, message: "QR Code souvenir tidak valid!" });
        }

        const userRef = db.ref("users/" + user.id);
        const userSnap = await userRef.get();
        const userData = userSnap.val() || {};

        // 1️⃣ Check-in wajib
        if (!userData.checkin_dates?.[today]) {
            return res.json({ success: false, message: "Silakan check-in terlebih dahulu." });
        }

        // 2️⃣ Sudah claim hari ini?
        if (userData.souvenir_claimed_dates?.[today]) {
            return res.json({ success: false, message: "Anda sudah mengambil souvenir hari ini." });
        }

        // 3️⃣ Wajib 5 booth
        if ((userData.visited_count || 0) < 5) {
            return res.json({
                success: false,
                message: "Anda harus mengunjungi minimal 5 booth."
            });
        }

        // 4️⃣ Kuota harian
        const quotaRef = db.ref(`services/souvenir/today_count/${today}`);
        const quotaSnap = await quotaRef.get();
        const countToday = quotaSnap.val() || 0;

        const limitSnap = await db.ref("services/souvenir/QUOTA").get();
        const limit = limitSnap.val() || 150;

        if (countToday >= limit) {
            return res.json({
                success: false,
                message: "Souvenir habis hari ini. Coba besok."
            });
        }

        // 5️⃣ Berikan souvenir
        await userRef.child(`souvenir_claimed_dates/${today}`).set(true);

        // 6️⃣ Update counter
        await quotaRef.set(countToday + 1);

        return res.json({
            success: true,
            message: "Souvenir berhasil di-claim!",
            redirect: "/souvenir-success"
        });

    } catch (err) {
        console.error("Souvenir error:", err);
        return res.json({ success: false, message: "Terjadi kesalahan server." });
    }
};


