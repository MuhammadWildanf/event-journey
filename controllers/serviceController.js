import { db } from "../server.js";

/* ---------------------------------------
   PAGE VIEW (Lunch, Souvenir, Photobooth, Games)
---------------------------------------- */
export const showLunch = async (req, res) => {
    const user = req.session.user;

    const snap = await db.ref("users/" + user.id).get();
    const userData = snap.exists() ? snap.val() : {};

    res.render("services/lunch", { user, userData });
};

export const showSouvenir = async (req, res) => {
    const user = req.session.user;

    const snap = await db.ref("users/" + user.id).get();
    const userData = snap.exists() ? snap.val() : {};

    res.render("services/souvenir", { user, userData });
};

export const showPhotobooth = (req, res) => {
    res.render("services/photobooth", { user: req.session.user });
};

export const showGames = (req, res) => {
    res.render("services/games", { user: req.session.user });
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

        if (!code || code !== "lunch") {
            return res.status(400).send("QR Code lunch tidak valid!");
        }

        // Ambil data user
        const userRef = db.ref("users/" + user.id);
        const snap = await userRef.get();
        const userData = snap.exists() ? snap.val() : {};

        // ❗ CEK: sudah ambil lunch atau belum
        if (userData.lunch_claimed === true) {
            return res.status(400).send("Anda sudah mengambil lunch box.");
        }

        // ❗ CEK KUOTA 300 LUNCH
        const countSnap = await db.ref("users")
            .orderByChild("lunch_claimed")
            .equalTo(true)
            .get();

        const lunchCount = countSnap.exists()
            ? Object.keys(countSnap.val()).length
            : 0;

        if (lunchCount >= 300) {
            return res.status(400).send("Lunch box sudah habis!");
        }

        // ✔ Tandai ambil lunch
        await userRef.update({
            lunch_claimed: true,
            lunch_claimed_at: new Date().toISOString(),
        });

        return res.redirect("/lunch-success");

    } catch (err) {
        console.error("Error lunch scan:", err);
        res.status(500).send("Terjadi kesalahan server");
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

        if (!code || code !== "souvenir") {
            return res.status(400).send("QR Code souvenir tidak valid!");
        }

        // Ambil data user
        const userRef = db.ref("users/" + user.id);
        const snap = await userRef.get();
        const userData = snap.exists() ? snap.val() : {};

        // ❗ CEK: sudah ambil souvenir atau belum
        if (userData.souvenir_claimed === true) {
            return res.status(400).send("Anda sudah mengambil souvenir.");
        }

        // ❗ CEK syarat 5 booth
        if (!userData.visited_count || userData.visited_count < 5) {
            return res.status(400).send(
                "Anda harus mengunjungi minimal 5 booth untuk mengambil souvenir."
            );
        }

        // ✔ Tandai ambil souvenir
        await userRef.update({
            souvenir_claimed: true,
            souvenir_claimed_at: new Date().toISOString(),
        });

        return res.redirect("/souvenir-success");

    } catch (err) {
        console.error("Error souvenir scan:", err);
        res.status(500).send("Terjadi kesalahan server");
    }
};
