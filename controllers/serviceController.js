import { db } from "../config/firebase.js";
import {
    getToday
} from "../utils/date.js";

/* ---------------------------------------
   PAGE VIEW (Lunch, Souvenir, Photobooth, Games)
---------------------------------------- */

export const showguestbook = async (req, res) => {
    const user = req.session.user; // Ambil data user yang sedang login
    if (!user) {
        return res.redirect("/login"); // Jika user belum login, arahkan ke halaman login
    }

    // Mengambil data user dari Firebase
    const snap = await db.ref("users/" + user.id).get();
    const userData = snap.exists() ? snap.val() : {};

    // Render halaman guestbook dengan data user
    res.render("services/guestbook", { user, userData });
};

export const showDoorprize = (req, res) => {
    try {
        console.log("Rendering doorprize page...");
        res.render("services/doorprize", {
            qrUrl: "/qr/services/doorprize.png"
        });
    } catch (err) {
        console.error("Error rendering doorprize page:", err);
        res.status(500).send(`Error loading doorprize page: ${err.message}`);
    }
};


export const handledoorprize = async (req, res) => {
    const user = req.session.user;
    if (!user) {
        return res.redirect("/login");
    }

    const { code } = req.body;

    if (code !== "doorprize") {
        return res.json({ success: false, message: "Invalid Doorprize QR code." });
    }

    const userRef = db.ref("users/" + user.id);
    const userSnap = await userRef.get();
    const userData = userSnap.val() || {};

    // 1️⃣ Already joined doorprize?
    if (userData.doorprize_joined === true) {
        return res.json({
            success: false,
            message: "You have already registered for the door prize."
        });
    }

    // 2️⃣ Get email from database or session (fallback)
    const userEmail = userData.email || user.email || "";
    const userName = userData.name || user.name || "";

    console.log("Doorprize scan - User ID:", user.id);
    console.log("Doorprize scan - Email from DB:", userData.email);
    console.log("Doorprize scan - Email from session:", user.email);
    console.log("Doorprize scan - Final email:", userEmail);

    // 3️⃣ Save entry to /doorprize (include email)
    const doorprizeRef = db.ref("doorprize");
    const newEntry = await doorprizeRef.push({
        name: userName,
        email: userEmail,
        timestamp: Date.now(),
        userId: user.id
    });
    
    console.log("Doorprize entry saved with ID:", newEntry.key);

    // 3️⃣ Mark user as joined
    await userRef.update({
        doorprize_joined: true
    });

    return res.json({
        success: true,
        message: "Door prize entry submitted successfully.",
        redirect: "/dashboard"
    });
};


export const showGrandprize = (req, res) => {
    res.render("services/grandprize", {
        qrUrl: "/qr/services/grandprize.png"
    });
};


export const handlegrandprize = async (req, res) => {
    const user = req.session.user;
    if (!user) {
        return res.redirect("/login");
    }

    const { code } = req.body;

    if (code !== "grandprize") {
        return res.json({ success: false, message: "Invalid Grandprize QR code." });
    }

    const userRef = db.ref("users/" + user.id);
    const userSnap = await userRef.get();
    const userData = userSnap.val() || {};

    // 1️⃣ Already joined grandprize?
    if (userData.grandprize_joined === true) {
        return res.json({
            success: false,
            message: "You have already registered for the door prize."
        });
    }

    // 2️⃣ Save entry to /grandprize
    const grandprizeRef = db.ref("grandprize");
    await grandprizeRef.push({
        name: userData.name,
        timestamp: Date.now(),
        userId: user.id
    });

    // 3️⃣ Mark user as joined
    await userRef.update({
        grandprize_joined: true
    });

    return res.json({
        success: true,
        message: "Door prize entry submitted successfully.",
        redirect: "/dashboard"
    });
};


export const handleguesbook = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Authentication required." });
        }

        const snap = await db.ref("users/" + user.id).get();
        const userData = snap.exists() ? snap.val() : {};

        const { comment, char } = req.body;

        // Debug log
        console.log("Guestbook request body:", req.body);
        console.log("Char value:", char, "Type:", typeof char);

        // Convert char to number (handle both string and number)
        const charNumber = Number(char);
        
        // Validasi charNumber harus valid number dan antara 1-3
        if (isNaN(charNumber) || charNumber < 1 || charNumber > 3) {
            return res.json({ success: false, message: "Please select a character." });
        }

        // Simpan data guestbook ke Firebase
        const guestbookRef = db.ref("guestbook");
        await guestbookRef.push({
            name: userData.name || "Anonymous", // Gunakan nama dari data user yang sedang login
            char: charNumber,  // Karakter yang dipilih
            comment: comment || "", // Komentar dari form
            timestamp: Date.now(),
        });

        // Return JSON response untuk handle alert di frontend
        return res.json({ 
            success: true, 
            message: "Thank you for participating!",
            redirect: "/dashboard"
        });
    } catch (err) {
        console.error("Guestbook error:", err);
        return res.json({ success: false, message: "Server error occurred." });
    }
};


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

    // Ambil data user
    const snap = await db.ref("users/" + user.id).get();
    const userData = snap.exists() ? snap.val() : {};

    const photosObj = userData.photos || {};
    const photos = Object.values(photosObj);

    // Hanya kirim URL asli, thumbnail akan dibuat di frontend
    res.render("services/photobooth", {
        user,
        photos
    });
};

export const uploadPhoto = async (req, res) => {
    const {
        user_id,
        photo_url
    } = req.body;

    if (!user_id || !photo_url) {
        return res.status(400).json({
            message: "Missing fields"
        });
    }

    // Masukkan photo_url ke list
    const newRef = db.ref(`users/${user_id}/photos`).push();
    await newRef.set(photo_url);

    // Set photobooth_done = true jika pertama kali
    await db.ref(`users/${user_id}`).update({
        photobooth_done: true
    });

    res.json({
        success: true
    });
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
        const {
            code
        } = req.body;
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

// v6
export const handleLunchScan = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ success: false, message: "Authentication required." });

    const { code } = req.body;
    const today = getToday();

    if (code !== "lunch") return res.json({ success: false, message: "Invalid lunch QR code." });

    const userRef = db.ref(`users/${user.id}`);
    const userSnap = await userRef.get();
    const userData = userSnap.val() || {};

    if (userData.lunch_claimed_dates?.[today]) {
      return res.json({ success: false, message: "You have already claimed lunch today." });
    }

    if (!userData.checkin_dates?.[today]) {
      return res.json({ success: false, message: "Please check in first." });
    }

    const limitSnap = await db.ref("services/lunch/QUOTA").get();
    const limit = Number(limitSnap.val()) || 0;

    // Cek apakah user adalah checkin pertama sesuai quota
    const checkinOrder = userData.checkin_order?.[today];
    if (!checkinOrder || checkinOrder > limit) {
      return res.json({ success: false, message: `Lunch is only available for the first ${limit} check-ins.` });
    }

    const quotaRef = db.ref(`services/lunch/today_count/${today}`);
    const txnResult = await quotaRef.transaction(current => {
      current = current || 0;
      if (current >= limit) return; // abort jika sold out
      return current + 1;
    });

    if (!txnResult) return res.json({ success: false, message: "Lunch is sold out for today." });

    await userRef.child(`lunch_claimed_dates/${today}`).set(true);
    return res.json({ success: true, message: "Lunch successfully claimed.", redirect: "/lunch-success" });

  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Server error occurred." });
  }
};

export const handleSouvenirScan = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ success: false, message: "Authentication required." });

    const { code } = req.body;
    const today = getToday();

    if (code !== "souvenir") return res.json({ success: false, message: "Invalid souvenir QR code." });

    const userRef = db.ref(`users/${user.id}`);
    const userSnap = await userRef.get();
    const userData = userSnap.val() || {};

    if (userData.souvenir_claimed) {
      return res.json({ success: false, message: "You have already claimed your souvenir." });
    }

    if (!userData.checkin_dates?.[today]) {
      return res.json({ success: false, message: "Please check in first." });
    }

    if ((userData.visited_count || 0) < 8) {
      return res.json({ success: false, message: "You must visit at least 8 booths to claim a souvenir." });
    }

    const limitSnap = await db.ref("services/souvenir/QUOTA").get();
    const limit = Number(limitSnap.val()) || 0;

    const quotaRef = db.ref(`services/souvenir/today_count/${today}`);
    const txnResult = await quotaRef.transaction(current => {
      current = current || 0;
      if (current >= limit) return; // abort jika quota habis hari ini
      return current + 1;
    });

    // Check if transaction was committed
    // Firebase Admin SDK v13 returns TransactionResult object with committed property
    const isCommitted = txnResult?.committed !== false && txnResult !== null && txnResult !== undefined;
    
    if (!isCommitted) {
      return res.json({ success: false, message: "Souvenir quota is finished for today. Please try again tomorrow." });
    }

    // Mark user as claimed - use update instead of child().set() for consistency
    await userRef.update({
      souvenir_claimed: true
    });
    
    return res.json({ success: true, message: "Souvenir successfully claimed.", redirect: "/souvenir-success" });

  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Server error occurred." });
  }
};


// v5 

// export const handleLunchScan = async (req, res) => {
//   try {
//     const user = req.session.user;
//     if (!user)
//       return res.status(401).json({ success: false, message: "Authentication required." });

//     const { code } = req.body;
//     const today = getToday();

//     if (code !== "lunch") {
//       return res.json({ success: false, message: "Invalid lunch QR code." });
//     }

//     const userRef = db.ref("users/" + user.id);
//     const userSnap = await userRef.get();
//     const userData = userSnap.val() || {};

//     // ❗ Cek klaim user dulu
//     if (userData.lunch_claimed_dates?.[today]) {
//       return res.json({ success: false, message: "You have already claimed lunch today." });
//     }

//     if (!userData.checkin_dates?.[today]) {
//       return res.json({ success: false, message: "Please check in first." });
//     }

//     const limitSnap = await db.ref("services/lunch/QUOTA").get();
//     const limit = Number(limitSnap.val()) || 0;

//     const quotaRef = db.ref(`services/lunch/today_count/${today}`);
//     const txnResult = await quotaRef.transaction(current => {
//       current = current || 0;
//       if (current >= limit) return; // abort jika sold out
//       return current + 1;
//     });

//     if (!txnResult) {
//       return res.json({ success: false, message: "Lunch is sold out for today." });
//     }

//     // ❗ Tandai user sudah klaim
//     await userRef.child(`lunch_claimed_dates/${today}`).set(true);

//     return res.json({ success: true, message: "Lunch successfully claimed.", redirect: "/lunch-success" });
//   } catch (err) {
//     console.error("Lunch error:", err);
//     return res.json({ success: false, message: "Server error occurred." });
//   }
// };

// export const handleSouvenirScan = async (req, res) => {
//   try {
//     const user = req.session.user;
//     if (!user)
//       return res.status(401).json({ success: false, message: "Authentication required." });

//     const { code } = req.body;
//     const today = getToday();

//     if (code !== "souvenir") {
//       return res.json({ success: false, message: "Invalid souvenir QR code." });
//     }

//     const userRef = db.ref("users/" + user.id);
//     const userSnap = await userRef.get();
//     const userData = userSnap.val() || {};

//     // ❗ Cek klaim user dulu
//     if (userData.souvenir_claimed === true) {
//       return res.json({ success: false, message: "You have already claimed your souvenir." });
//     }

//     if (!userData.checkin_dates?.[today]) {
//       return res.json({ success: false, message: "Please check in first." });
//     }

//     if ((userData.visited_count || 0) < 5) {
//       return res.json({
//         success: false,
//         message: "You must visit at least 5 booths to claim a souvenir."
//       });
//     }

//     const limitSnap = await db.ref("services/souvenir/QUOTA").get();
//     const limit = Number(limitSnap.val()) || 0;

//     const quotaRef = db.ref(`services/souvenir/total_count`);
//     const txnResult = await quotaRef.transaction(current => {
//       current = current || 0;
//       if (current >= limit) return; // abort jika quota habis
//       return current + 1;
//     });

//     if (!txnResult) {
//       return res.json({
//         success: false,
//         message: "Souvenir quota is finished for now. Please try again tomorrow."
//       });
//     }

//     // ❗ Tandai user sudah klaim
//     await userRef.child(`souvenir_claimed`).set(true);

//     return res.json({
//       success: true,
//       message: "Souvenir successfully claimed.",
//       redirect: "/souvenir-success"
//     });
//   } catch (err) {
//     console.error("Souvenir error:", err);
//     return res.json({ success: false, message: "Server error occurred." });
//   }
// };



// v4


// export const handleLunchScan = async (req, res) => {
//     try {
//         const user = req.session.user;
//         if (!user) return res.status(401).json({
//             success: false,
//             message: "Authentication required."
//         });

//         const {
//             code
//         } = req.body;
//         const today = getToday();

//         if (code !== "lunch") {
//             return res.json({
//                 success: false,
//                 message: "Invalid lunch QR code."
//             });
//         }

//         const userRef = db.ref("users/" + user.id);
//         const userSnap = await userRef.get();
//         const userData = userSnap.val() || {};

//         // 1️⃣ Must be checked-in today
//         if (!userData.checkin_dates ?. [today]) {
//             return res.json({
//                 success: false,
//                 message: "Please check in first."
//             });
//         }

//         // 2️⃣ Already claimed today?
//         if (userData.lunch_claimed_dates ?. [today]) {
//             return res.json({
//                 success: false,
//                 message: "You have already claimed lunch today."
//             });
//         }

//         // 3️⃣ Get limit
//         const limitSnap = await db.ref("services/lunch/QUOTA").get();
//         const limit = Number(limitSnap.val()) || 0;

//         // 4️⃣ Atomic increment using transaction
//         const quotaRef = db.ref(`services/lunch/today_count/${today}`);
//         const txnResult = await quotaRef.transaction(current => {
//             current = current || 0;
//             if (current >= limit) {
//                 return; // abort - sold out
//             }
//             return current + 1;
//         }, (error, committed, snapshot) => {
//             if (error) {
//                 console.error("Transaction failed:", error);
//                 return res.json({
//                     success: false,
//                     message: "Transaction failed."
//                 });
//             }
//             if (!committed) {
//                 return res.json({
//                     success: false,
//                     message: "Lunch is sold out for today."
//                 });
//             }
//             console.log("Transaction completed, new value:", snapshot.val());
//         });

//         // 5️⃣ Mark user as claimed
//         await userRef.child(`lunch_claimed_dates/${today}`).set(true);

//         return res.json({
//             success: true,
//             message: "Lunch successfully claimed.",
//             redirect: "/lunch-success"
//         });

//     } catch (err) {
//         console.error("Lunch error:", err);
//         return res.json({
//             success: false,
//             message: "Server error occurred."
//         });
//     }
// };


// export const handleSouvenirScan = async (req, res) => {
//     try {
//         const user = req.session.user;
//         if (!user) return res.status(401).json({
//             success: false,
//             message: "Authentication required."
//         });

//         const {
//             code
//         } = req.body;
//         const today = getToday();

//         if (code !== "souvenir") {
//             return res.json({
//                 success: false,
//                 message: "Invalid souvenir QR code."
//             });
//         }

//         const userRef = db.ref("users/" + user.id);
//         const userSnap = await userRef.get();
//         const userData = userSnap.val() || {};

//         // 1️⃣ MUST check-in today (supaya tidak ambil tanpa hadir)
//         if (!userData.checkin_dates ?. [today]) {
//             return res.json({
//                 success: false,
//                 message: "Please check in first."
//             });
//         }

//         // 2️⃣ Already claimed souvenir ANY DAY?
//         if (userData.souvenir_claimed === true) {
//             return res.json({
//                 success: false,
//                 message: "You have already claimed your souvenir."
//             });
//         }

//         // 3️⃣ Must have visited at least 5 booths (boleh dicapai hari sebelumnya)
//         if ((userData.visited_count || 0) < 5) {
//             return res.json({
//                 success: false,
//                 message: "You must visit at least 5 booths to claim a souvenir."
//             });
//         }

//         // 4️⃣ GLOBAL QUOTA (total 150, tidak reset)
//         const limitSnap = await db.ref("services/souvenir/QUOTA").get();
//         const limit = Number(limitSnap.val()) || 0;


//         const quotaRef = db.ref(`services/souvenir/total_count`);

//         const txnResult = await quotaRef.transaction(current => {
//             current = current || 0;
//             if (current >= limit) return; // kuota habis
//             return current + 1;
//         }, (error, committed, snapshot) => {
//             if (error) {
//                 console.error("Transaction failed:", error);
//                 return res.json({
//                     success: false,
//                     message: "Transaction failed."
//                 });
//             }
//             if (!committed) {
//                 // ❗ Kuota habis hari ini, tapi besok tetap boleh coba lagi
//                 return res.json({
//                     success: false,
//                     message: "Souvenir quota is finished for now. Please try again tomorrow."
//                 });
//             }
//         });

//         // 5️⃣ Mark souvenir as claimed
//         await userRef.child(`souvenir_claimed`).set(true);

//         return res.json({
//             success: true,
//             message: "Souvenir successfully claimed.",
//             redirect: "/souvenir-success"
//         });

//     } catch (err) {
//         console.error("Souvenir error:", err);
//         return res.json({
//             success: false,
//             message: "Server error occurred."
//         });
//     }
// };


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




