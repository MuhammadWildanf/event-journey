import { handleLunchScan, handleSouvenirScan } from "./serviceController.js";
import { handleCheckin } from "./checkinController.js";
import {
    db
} from "../server.js";

function normalizeBoothKey(str) {
    return str
        .toLowerCase()
        .normalize("NFD")                    // hilangkan karakter aneh
        .replace(/[\u0300-\u036f]/g, "")     //
        .replace(/&/g, "and")                // ganti karakter simbol
        .replace(/[^a-z0-9]+/g, "_")         // semua non alfanumerik jadi _
        .replace(/_+/g, "_")                 // fix underscore berlebih
        .replace(/^_+|_+$/g, "");            // trim underscore
}


export const showScan = (req, res) => {
    const user = req.session.user;
    if (!user) return res.redirect("/login");
    res.render("scan", {
        user
    });
};


export const handleScanResult = async (req, res) => {
    try {
        const { boothCode, redirect } = req.body;
        const user = req.session.user;

        if (!boothCode) {
            return res.json({ success: false, message: "Invalid QR code." });
        }

        // Normalisasi QR
        const code = boothCode.toLowerCase();
        const boothKey = normalizeBoothKey(boothCode);

        const SCAN_ACTIONS = {
            checkin: handleCheckin,
            lunch: handleLunchScan,
            souvenir: handleSouvenirScan,
            photobooth: "/photobooth",
            games: "/games"
        };

        // --- Service scan seperti checkin/lunch/souvenir
        if (typeof SCAN_ACTIONS[code] === "function") {
            req.body.code = code;
            return SCAN_ACTIONS[code](req, res);
        }

        // --- Direct redirect services (photobooth / games)
        if (typeof SCAN_ACTIONS[code] === "string") {
            return res.json({
                success: true,
                message: "Redirecting to page...",
                redirect: SCAN_ACTIONS[code]
            });
        }

        // =====================================
        // 🔵 BOOTH SCANNING — GET BOOTH NAME
        // =====================================
        const boothsSnap = await db.ref("booths").child(boothKey).get();

        if (!boothsSnap.exists()) {
            return res.json({
                success: false,
                message: "Booth not found."
            });
        }

        const boothData = boothsSnap.val();
        const boothName = boothData.name || boothKey;

        // =====================================
        // 🔵 Tandai visited
        // =====================================
        const userRef = db.ref(`users/${user.id}`);

        await userRef.child(`booths_visited/${boothKey}`).set(true);

        const snap = await userRef.child("booths_visited").get();
        const count = snap.exists() ? Object.keys(snap.val()).length : 0;

        await userRef.update({
            visited_count: count,
            reward_ready: count >= 5
        });

        // =====================================
        // 🔥 Response memakai NAMA BOOTH
        // =====================================
        return res.json({
            success: true,
            message: `Successfully visited booth ${boothName}.`,
            boothName,
            redirect: `/booth/${boothKey}`
        });

    } catch (err) {
        console.error("Scan error:", err);
        return res.json({
            success: false,
            message: "Server error occurred."
        });
    }
};

