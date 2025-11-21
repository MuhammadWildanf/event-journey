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

function driveThumbnail(url) {
    if (!url) return null;

    // pola umum GDrive
    const regexList = [
        /\/d\/([^/]+)/,
        /id=([^&]+)/,
        /\/uc\?id=([^&]+)/,
    ];

    for (const reg of regexList) {
        const match = url.match(reg);
        if (match) {
            return `https://drive.google.com/thumbnail?id=${match[1]}&t=${Date.now()}`;
        }
    }

    return url; // jika gagal tetap tampilkan URL asli
}


export const showPhotobooth = async (req, res) => {
    const user = req.session.user;

    const snap = await db.ref("users/" + user.id).get();
    const userData = snap.exists() ? snap.val() : {};

    const photosObj = userData.photos || {};
    const photos = Object.values(photosObj);

    const thumbnails = photos.map(url => driveThumbnail(url));

    res.render("services/photobooth", {
        user,
        userData,
        photos,
        thumbnails,
        driveThumbnail
    });
};


export const uploadPhoto = async (req, res) => {
    const { user_id, photo_url } = req.body;

    if (!user_id || !photo_url) {
        return res.status(400).json({ message: "Missing fields" });
    }

    // Masukkan photo_url ke list
    const newRef = db.ref(`users/${user_id}/photos`).push();
    await newRef.set(photo_url);

    // Set photobooth_done = true jika pertama kali
    await db.ref(`users/${user_id}`).update({
        photobooth_done: true
    });

    res.json({ success: true });
};





export const showGames = async (req, res) => {
    // Ambil user ID dari session
    const userId = req.session.user?.id;

    if (!userId) {
        return res.redirect("/login");
    }

    // Ambil user terbaru dari Firebase
    const snap = await db.ref("users/" + userId).get();
    const userData = snap.val() || {};

    res.render("services/games", {
        user: userData
    });
};


export const handleGameScan = async (req, res) => {
    try {
        const { code } = req.body;
        const user = req.session.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const userRef = db.ref("users/" + user.id);
        const userSnap = await userRef.get();
        const userData = userSnap.val() || {};

        // gameKey = QR code
        const gameKey = code;

        // 1️⃣ Load game data from Firebase
        const gameSnap = await db.ref("services/" + gameKey).get();
        const gameData = gameSnap.val();

        if (!gameData) {
            return res.json({
                success: false,
                message: "Invalid game QR code."
            });
        }

        const gameName = gameData.name || gameKey;

        // 2️⃣ Check if already completed
        const games_done = userData.games_done || {};

        if (games_done[gameKey]) {
            return res.json({
                success: false,
                message: `You have already completed the game: ${gameName}.`
            });
        }

        // 3️⃣ Mark game as completed
        games_done[gameKey] = true;

        await userRef.update({
            games_done,
            games_done_count: (userData.games_done_count || 0) + 1
        });

        return res.json({
            success: true,
            message: `You completed the game ${gameName}!`,
            redirect: "/games"
        });

    } catch (err) {
        console.error("Game scan error:", err);
        return res.json({
            success: false,
            message: "Error scanning game QR."
        });
    }
};



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
//         if (userData.souvenir_claimed === true) {
//             return res.json({ success: false, message: "You have already claimed a souvenir." });
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
//         }, (error, committed, snapshot) => {
//             if (error) {
//                 console.error("Transaction failed:", error);
//                 return res.json({ success: false, message: "Transaction failed." });
//             }
//             if (!committed) {
//                 return res.json({ success: false, message: "Souvenirs are sold out for today. Please try another day." });
//             }
//             console.log("Transaction completed, new value:", snapshot.val());
//         });

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

        // 1️⃣ MUST check-in today (supaya tidak ambil tanpa hadir)
        if (!userData.checkin_dates?.[today]) {
            return res.json({ success: false, message: "Please check in first." });
        }

        // 2️⃣ Already claimed souvenir ANY DAY?
        if (userData.souvenir_claimed === true) {
            return res.json({ success: false, message: "You have already claimed your souvenir." });
        }

        // 3️⃣ Must have visited at least 5 booths (boleh dicapai hari sebelumnya)
        if ((userData.visited_count || 0) < 5) {
            return res.json({
                success: false,
                message: "You must visit at least 5 booths to claim a souvenir."
            });
        }

        // 4️⃣ GLOBAL QUOTA (total 150, tidak reset)
        const limitSnap = await db.ref("services/souvenir/QUOTA").get();
        const limit = limitSnap.val() || 150;

        const quotaRef = db.ref(`services/souvenir/total_count`);

        const txnResult = await quotaRef.transaction(current => {
            current = current || 0;
            if (current >= limit) return; // kuota habis
            return current + 1;
        }, (error, committed, snapshot) => {
            if (error) {
                console.error("Transaction failed:", error);
                return res.json({ success: false, message: "Transaction failed." });
            }
            if (!committed) {
                // ❗ Kuota habis hari ini, tapi besok tetap boleh coba lagi
                return res.json({
                    success: false,
                    message: "Souvenir quota is finished for now. Please try again tomorrow."
                });
            }
        });

        // 5️⃣ Mark souvenir as claimed
        await userRef.child(`souvenir_claimed`).set(true);

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




