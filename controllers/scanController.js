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

// export const handleScanResult = async (req, res) => {
//     try {
//         const { boothCode } = req.body;
//         const user = req.session.user;

//         if (!boothCode) {
//             return res.status(400).send("QR Code tidak valid");
//         }

//         const userRef = db.ref(`users/${user.id}`);
//         const snap = await userRef.get();
//         const userData = snap.exists() ? snap.val() : {};

//         await userRef.child(`booths_visited/${boothCode}`).set(true);

//         const newSnap = await userRef.child("booths_visited").get();
//         const visitedCount = newSnap.exists() ? Object.keys(newSnap.val()).length : 0;

//         await userRef.update({
//             visited_count: visitedCount,
//             reward_ready: visitedCount >= 5,
//         });

//         // res.redirect(`/booth/${boothCode}`);
//         res.redirect(redirectTo);
//     } catch (err) {
//         console.error("Error handle scan:", err);
//         res.status(500).send("Internal Server Error");
//     }
// };



// v2 
// export const handleScanResult = async (req, res) => {
//     try {
//         const { boothCode } = req.body;
//         const user = req.session.user;

//         if (!boothCode) {
//             return res.status(400).send("QR Code tidak valid");
//         }

//         const userRef = db.ref(`users/${user.id}`);
//         const snap = await userRef.get();
//         const userData = snap.exists() ? snap.val() : {};

//         await userRef.child(`booths_visited/${boothCode}`).set(true);

//         const newSnap = await userRef.child("booths_visited").get();
//         const visitedCount = newSnap.exists() ? Object.keys(newSnap.val()).length : 0;

//         await userRef.update({
//             visited_count: visitedCount,
//             reward_ready: visitedCount >= 5,
//         });

//         // 🔥 Ambil redirect jika ada
//        let redirectTo = req.body.redirect || `/booth/${boothCode}`;


//         // safety redirect
//         if (!redirectTo.startsWith('/')) {
//             redirectTo = `/booth/${boothCode}`;
//         }

//         res.redirect(redirectTo);

//     } catch (err) {
//         console.error("Error handle scan:", err);
//         res.status(500).send("Internal Server Error");
//     }
// };


// v3 




export const handleScanResult = async (req, res) => {
    try {
        const { boothCode, redirect } = req.body;
        const user = req.session.user;

        if (!boothCode) {
            return res.json({ success: false, message: "QR Code tidak valid." });
        }

        // Normalisasi QR sebelum digunakan
        const code = boothCode.toLowerCase();
        const boothKey = normalizeBoothKey(boothCode);

        const SCAN_ACTIONS = {
            checkin: handleCheckin,
            lunch: handleLunchScan,
            souvenir: handleSouvenirScan,
            photobooth: "/photobooth",
            games: "/games"
        };

        // 🔥 Jika QR adalah CHECK-IN / LUNCH / SOUVENIR → direct process
        if (typeof SCAN_ACTIONS[code] === "function") {
            req.body.code = code;
            return SCAN_ACTIONS[code](req, res);
        }

        // 🔥 Jika service redirect (photobooth / games)
        if (typeof SCAN_ACTIONS[code] === "string") {
            return res.json({
                success: true,
                message: "Arahkan ke halaman...",
                redirect: SCAN_ACTIONS[code]
            });
        }

        // 🔵 Default → BOOTH visit
        const userRef = db.ref(`users/${user.id}`);

        // tandai visited booth normalizer → benar!
        await userRef.child(`booths_visited/${boothKey}`).set(true);

        // hitung jumlah booth yang dikunjungi
        const snap = await userRef.child("booths_visited").get();
        const count = snap.exists() ? Object.keys(snap.val()).length : 0;

        await userRef.update({
            visited_count: count,
            reward_ready: count >= 5
        });

        return res.json({
            success: true,
            message: `Berhasil mengunjungi booth ${boothKey}.`,
            redirect: `/booth/${boothKey}`
        });

    } catch (err) {
        console.error("Scan error:", err);
        return res.json({
            success: false,
            message: "Terjadi kesalahan server."
        });
    }
};
