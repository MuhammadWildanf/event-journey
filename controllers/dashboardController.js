import { db } from "../config/firebase.js";
import { getToday } from "../utils/date.js";

export const showDashboard = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) return res.redirect("/login");

        const today = getToday(); // "2025-11-17"
        const userRef = db.ref(`users/${user.id}`);

        const snap = await userRef.get();
        const d = snap.exists() ? snap.val() : {};

        const boothsVisited = d.booths_visited || {};
        const visitCount = Object.keys(boothsVisited).length;

        // ----- CHECK-IN STATUS -----
        const todayCheckin = d.checkin_dates?.[today] === true;

        // Ambil urutan check-in user
        const checkinOrderToday = d.checkin_order?.[today] || null;

        // Ambil kuota check-in hari ini (untuk lunch)
        const checkinCountSnap = await db.ref(`services/checkin/today_count/${today}`).get();
        const checkinCountToday = checkinCountSnap.val() || 0;

        // Ambil kuota lunch & souvenir dari database
        const lunchLimitSnap = await db.ref("services/lunch/QUOTA").get();
        const souvenirLimitSnap = await db.ref("services/souvenir/QUOTA").get();
        const lunchLimit = Number(lunchLimitSnap.val()) || 0;
        const souvenirLimit = Number(souvenirLimitSnap.val()) || 0;

        const lunchCount = (await db.ref(`services/lunch/today_count/${today}`).get()).val() || 0;
        const souvenirCount = (await db.ref(`services/souvenir/today_count/${today}`).get()).val() || 0;

        // ----- FEATURE ACTIVE LOGIC -----

        // LUNCH
        const lunchActive =
            todayCheckin &&
            checkinOrderToday &&
            checkinOrderToday <= lunchLimit &&
            !d.lunch_claimed_dates?.[today];

        // SOUVENIR
        const souvenirActive =
            todayCheckin &&
            visitCount >= 8 &&
            souvenirCount < souvenirLimit &&
            !d.souvenir_claimed;
        // BOOTH
        const boothActive = todayCheckin;

        // PHOTBOOTH & GAMES
        const photoActive = todayCheckin && d.photobooth_done;
        const gamesActive = todayCheckin && d.games_done;

        res.render("dashboard", {
            user: {
                id: user.id,
                name: d.name || "-",
                email: d.email || "-",

                visited_count: visitCount,
                today_checkin: todayCheckin,
                checkin_order: checkinOrderToday,

                lunch_active: lunchActive,
                souvenir_active: souvenirActive,
                booth_active: boothActive,
                photobooth_active: photoActive,
                games_active: gamesActive,
            },
        });

    } catch (err) {
        console.error("Dashboard error:", err);
        res.status(500).send("Internal Server Error");
    }
};
