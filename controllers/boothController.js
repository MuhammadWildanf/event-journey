import { db } from "../server.js";

// 🧩 Menampilkan daftar semua booth
export const showBoothList = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) return res.redirect("/login");

        // Ambil data booth dari Firebase
        const snap = await db.ref("booths").get();
        const booths = snap.exists() ? snap.val() : {};

        res.render("booth/index", { user, booths });
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
        if (!user) return res.redirect("/login");

        const boothSnap = await db.ref(`booths/${type}`).get();
        const boothData = boothSnap.exists() ? boothSnap.val() : {};

        const reviewsSnap = await db.ref(`reviews/${type}`).get();
        const reviews = reviewsSnap.exists() ? Object.values(reviewsSnap.val()) : [];

        res.render("booth/detail", {
            user,
            boothType: type,
            boothData,
            reviews,
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

        const reviewRef = db.ref(`reviews/${type}`).push();
        await reviewRef.set({
            user: user.name,
            rating: Number(rating),
            comment,
            created_at: new Date().toISOString(),
        });

        res.redirect(`/booth/${type}`);
    } catch (err) {
        console.error("Error saving review:", err);
        res.status(500).send("Internal Server Error");
    }
};
