import {
    db
} from "../server.js";

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
        const {
            boothCode,
            redirect
        } = req.body; // 👈 redirect ditambah
        const user = req.session.user;

        if (!boothCode) {
            return res.status(400).send("QR Code tidak valid");
        }

        const code = boothCode.toLowerCase();
        let redirectTo = redirect && redirect.startsWith("/") ?
            redirect // 👈 prioritas redirect param
            :
            null;

        // =============================
        // 🔥 1) LUNCH  (langsung handle)
        // =============================
        if (code === "lunch") {
            return res.redirect(307, "/scan-lunch/result");
        }

        // =============================
        // 🔥 2) SOUVENIR (langsung handle)
        // =============================
        if (code === "souvenir") {
            return res.redirect(307, "/scan-souvenir/result");
        }

        // =============================
        // 🔥 3) PHOTOBOOTH
        // =============================
        if (code === "photobooth") {
            return res.redirect("/photobooth");
        }

        // =============================
        // 🔥 4) GAMES
        // =============================
        if (code === "games") {
            return res.redirect("/games");
        }

        // =============================
        // 🔵 5) BOOTH (default)
        // =============================
        const userRef = db.ref(`users/${user.id}`);

        await userRef.child(`booths_visited/${code}`).set(true);

        const snap = await userRef.child("booths_visited").get();
        const count = snap.exists() ? Object.keys(snap.val()).length : 0;

        await userRef.update({
            visited_count: count,
            reward_ready: count >= 5
        });

        // default redirect booth jika tidak pakai redirect param
        if (!redirectTo) {
            redirectTo = `/booth/${code}`;
        }

        return res.redirect(redirectTo);

    } catch (err) {
        console.error("Scan error:", err);
        return res.status(500).send("Internal Server Error");
    }
};