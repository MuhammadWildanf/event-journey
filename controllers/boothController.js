import { db } from "../config/firebase.js";

// 🧩 Menampilkan daftar semua booth
export const showBoothList = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) return res.redirect("/login");

        const snap = await db.ref("booths").get();
        const booths = snap.exists() ? snap.val() : {};

        const visitedSnap = await db.ref(`users/${user.id}/booths_visited`).get();
        const visited = visitedSnap.exists() ? visitedSnap.val() : {};

        console.log("Visited:", visited);

        res.render("booth/index", { user, booths, visited });

    } catch (err) {
        console.error("Error loading booth list:", err);
        res.status(500).send("Internal Server Error");
    }
};



// 🧩 Menampilkan detail booth (review + rating)
export const showBoothDetail = async (req, res) => {
    try {
        const { type } = req.params;
        const user = req.session.user;

        // Booth info
        const boothSnap = await db.ref(`booths/${type}`).get();
        const boothData = boothSnap.exists() ? boothSnap.val() : { name: type };

        // Ambil semua review booth
        const reviewsSnap = await db.ref(`reviews/${type}`).get();
        const reviews = reviewsSnap.exists() ? Object.values(reviewsSnap.val()) : [];

        // 🔥 Cek apakah user sudah review booth ini
        let userReview = reviews.find(r => r.userId === user.id) || null;

        res.render("booth/detail", {
            user,
            boothType: type,
            boothData,
            reviews,
            userReview, // ⬅ penting!
        });

    } catch (err) {
        console.error("Error loading booth detail:", err);
        res.status(500).send("Internal Server Error");
    }
};



// 🧩 Simpan review
export const submitBoothReview = async (req, res) => {
    try {
        const { type } = req.params;
        const { rating, comment } = req.body;
        const user = req.session.user;

        // VALIDASI HANYA RATING
        if (!rating) {
            return res.status(400).send("Rating is required.");
        }

        // DATA REVIEW
        const reviewRef = db.ref(`reviews/${type}`).push();
        await reviewRef.set({
            userId: user.id,
            user: user.name,
            rating: Number(rating),
            comment: comment || "", // comment tidak wajib
            created_at: new Date().toISOString(),
        });

        return res.redirect(`/booth/${type}`);

    } catch (err) {
        console.error("Error saving review:", err);
        res.status(500).send("Internal Server Error");
    }
};

