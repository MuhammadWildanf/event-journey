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

export const showPhotobooth = async (req, res) => {
    const user = req.session.user;

    const snap = await db.ref("users/" + user.id).get();
    const userData = snap.exists() ? snap.val() : {};

    // Mendapatkan URL foto dari Google Drive yang sudah di-upload
    const lastPhotoUrl = userData.last_photo_url;  // Jika sudah ada foto yang di-upload

    res.render("services/photobooth", {
        user,
        userData,
        lastPhotoUrl  // Mengirimkan URL foto ke frontend
    });
};

export const showGames = (req, res) => {
    res.render("services/games", {
        user: req.session.user
    });
};


export const handleGameScan = async (req, res) => {
    try {
        const { code } = req.body;
        const user = req.session.user;
        const today = getToday();

        const userRef = db.ref("users/" + user.id);
        const userSnap = await userRef.get();
        const userData = userSnap.val() || {};

        // Check if game has been completed
        const games_done = userData.games_done || {};
        const gameKey = code; // Using the QR code as the game identifier

        if (games_done[gameKey]) {
            return res.json({
                success: false,
                message: "You have already completed this game."
            });
        }

        // Mark game as completed
        games_done[gameKey] = true;

        await userRef.update({
            games_done: games_done,
            games_done_count: (userData.games_done_count || 0) + 1
        });

        return res.json({
            success: true,
            message: `You won the ${gameKey}!`,
            redirect: `/games/${gameKey}`
        });

    } catch (err) {
        console.error("Game scan error:", err);
        return res.json({
            success: false,
            message: "Error scanning game QR."
        });
    }
};

/* ---------------------------------------
v1
   🔥 HANDLE LUNCH SCAN
   - QR harus bernilai: "lunch"
   - Lunch hanya untuk 300 pengunjung pertama
---------------------------------------- */
// export const handleLunchScan = async (req, res) => {
//     try {
//         const user = req.session.user;
//         if (!user) return res.status(401).json({ success: false, message: "Authentication required." });

//         const { code } = req.body;
//         const today = getToday();

//         if (code !== "lunch") {
//             return res.json({ success: false, message: "Invalid lunch QR code." });
//         }

//         const userRef = db.ref("users/" + user.id);
//         const userSnap = await userRef.get();
//         const userData = userSnap.val() || {};

//         // 1️⃣ Must be checked-in today
//         if (!userData.checkin_dates?.[today]) {
//             return res.json({ success: false, message: "Please check in first." });
//         }

//         // 2️⃣ Already claimed today?
//         if (userData.lunch_claimed_dates?.[today]) {
//             return res.json({ success: false, message: "You have already claimed lunch today." });
//         }

//         // 3️⃣ Get limit
//         const limitSnap = await db.ref("services/lunch/QUOTA").get();
//         const limit = limitSnap.val() || 300;

//         // 4️⃣ Atomic increment using transaction to prevent oversubscribe
//         const quotaRef = db.ref(`services/lunch/today_count/${today}`);
//         const txnResult = await quotaRef.transaction(current => {
//             current = current || 0;
//             if (current >= limit) {
//                 return; // abort - sold out
//             }
//             return current + 1;
//         }, {});

//         if (!txnResult.committed) {
//             return res.json({ success: false, message: "Lunch is sold out for today." });
//         }

//         // 5️⃣ Mark user as claimed
//         await userRef.child(`lunch_claimed_dates/${today}`).set(true);

//         return res.json({
//             success: true,
//             message: "Lunch successfully claimed.",
//             redirect: "/lunch-success"
//         });

//     } catch (err) {
//         console.error("Lunch error:", err);
//         return res.json({ success: false, message: "Server error occurred." });
//     }
// };



export const handleLunchScan = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) return res.status(401).json({ success: false, message: "Authentication required." });

        const { code } = req.body;
        const today = getToday();

        if (code !== "lunch") {
            return res.json({ success: false, message: "Invalid lunch QR code." });
        }

        const userRef = db.ref("users/" + user.id);
        const userSnap = await userRef.get();
        const userData = userSnap.val() || {};

        // 1️⃣ Must be checked-in today
        if (!userData.checkin_dates?.[today]) {
            return res.json({ success: false, message: "Please check in first." });
        }

        // 2️⃣ Already claimed today?
        if (userData.lunch_claimed_dates?.[today]) {
            return res.json({ success: false, message: "You have already claimed lunch today." });
        }

        // 3️⃣ Get limit
        const limitSnap = await db.ref("services/lunch/QUOTA").get();
        const limit = limitSnap.val() || 300;

        // 4️⃣ Atomic increment using transaction
        const quotaRef = db.ref(`services/lunch/today_count/${today}`);
        const txnResult = await quotaRef.transaction(current => {
            current = current || 0;
            if (current >= limit) {
                return; // abort - sold out
            }
            return current + 1;
        }, (error, committed, snapshot) => {
            if (error) {
                console.error("Transaction failed:", error);
                return res.json({ success: false, message: "Transaction failed." });
            }
            if (!committed) {
                return res.json({ success: false, message: "Lunch is sold out for today." });
            }
            console.log("Transaction completed, new value:", snapshot.val());
        });

        // 5️⃣ Mark user as claimed
        await userRef.child(`lunch_claimed_dates/${today}`).set(true);

        return res.json({
            success: true,
            message: "Lunch successfully claimed.",
            redirect: "/lunch-success"
        });

    } catch (err) {
        console.error("Lunch error:", err);
        return res.json({ success: false, message: "Server error occurred." });
    }
};


/* ---------------------------------------
v1
   🔥 HANDLE SOUVENIR SCAN
   - QR harus bernilai: "souvenir"
   - Souvenir hanya untuk yang visit ≥ 5 booth
---------------------------------------- */
// export const handleSouvenirScan = async (req, res) => {
//     try {
//         const user = req.session.user;
//         if (!user) return res.status(401).json({ success: false, message: "Authentication required." });

//         const { code } = req.body;
//         const today = getToday();

//         if (code !== "souvenir") {
//             return res.json({ success: false, message: "Invalid souvenir QR code." });
//         }

//         const userRef = db.ref("users/" + user.id);
//         const userSnap = await userRef.get();
//         const userData = userSnap.val() || {};

//         // 1️⃣ Must be checked-in today
//         if (!userData.checkin_dates?.[today]) {
//             return res.json({ success: false, message: "Please check in first." });
//         }

//         // 2️⃣ Already claimed today?
//         if (userData.souvenir_claimed_dates?.[today]) {
//             return res.json({ success: false, message: "You have already claimed a souvenir today." });
//         }

//         // 3️⃣ Must have visited at least 5 booths
//         if ((userData.visited_count || 0) < 5) {
//             return res.json({
//                 success: false,
//                 message: "You must visit at least 5 booths to claim a souvenir."
//             });
//         }

//         // 4️⃣ Get limit
//         const limitSnap = await db.ref("services/souvenir/QUOTA").get();
//         const limit = limitSnap.val() || 150;

//         // 5️⃣ Atomic increment using transaction
//         const quotaRef = db.ref(`services/souvenir/today_count/${today}`);
//         const txnResult = await quotaRef.transaction(current => {
//             current = current || 0;
//             if (current >= limit) {
//                 return; // abort - sold out
//             }
//             return current + 1;
//         }, {});

//         if (!txnResult.committed) {
//             return res.json({ success: false, message: "Souvenirs are sold out for today. Please try another day." });
//         }

//         // 6️⃣ Mark user as claimed
//         await userRef.child(`souvenir_claimed_dates/${today}`).set(true);

//         return res.json({
//             success: true,
//             message: "Souvenir successfully claimed.",
//             redirect: "/souvenir-success"
//         });

//     } catch (err) {
//         console.error("Souvenir error:", err);
//         return res.json({ success: false, message: "Server error occurred." });
//     }
// };


export const handleSouvenirScan = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) return res.status(401).json({ success: false, message: "Authentication required." });

        const { code } = req.body;
        const today = getToday();

        if (code !== "souvenir") {
            return res.json({ success: false, message: "Invalid souvenir QR code." });
        }

        const userRef = db.ref("users/" + user.id);
        const userSnap = await userRef.get();
        const userData = userSnap.val() || {};

        // 1️⃣ Must be checked-in today
        if (!userData.checkin_dates?.[today]) {
            return res.json({ success: false, message: "Please check in first." });
        }

        // 2️⃣ Already claimed today?
        if (userData.souvenir_claimed_dates?.[today]) {
            return res.json({ success: false, message: "You have already claimed a souvenir today." });
        }

        // 3️⃣ Must have visited at least 5 booths
        if ((userData.visited_count || 0) < 5) {
            return res.json({
                success: false,
                message: "You must visit at least 5 booths to claim a souvenir."
            });
        }

        // 4️⃣ Get limit
        const limitSnap = await db.ref("services/souvenir/QUOTA").get();
        const limit = limitSnap.val() || 150;

        // 5️⃣ Atomic increment using transaction
        const quotaRef = db.ref(`services/souvenir/today_count/${today}`);
        const txnResult = await quotaRef.transaction(current => {
            current = current || 0;
            if (current >= limit) {
                return; // abort - sold out
            }
            return current + 1;
        }, (error, committed, snapshot) => {
            if (error) {
                console.error("Transaction failed:", error);
                return res.json({ success: false, message: "Transaction failed." });
            }
            if (!committed) {
                return res.json({ success: false, message: "Souvenirs are sold out for today. Please try another day." });
            }
            console.log("Transaction completed, new value:", snapshot.val());
        });

        // 6️⃣ Mark user as claimed
        await userRef.child(`souvenir_claimed_dates/${today}`).set(true);

        return res.json({
            success: true,
            message: "Souvenir successfully claimed.",
            redirect: "/souvenir-success"
        });

    } catch (err) {
        console.error("Souvenir error:", err);
        return res.json({ success: false, message: "Server error occurred." });
    }
};

