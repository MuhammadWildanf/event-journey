import { db } from "../server.js";

export const showScan = (req, res) => {
    const user = req.session.user;
    if (!user) return res.redirect("/login");
    res.render("scan", { user });
};

export const handleScanResult = async (req, res) => {
    try {
        const { boothCode } = req.body;
        const user = req.session.user;

        if (!boothCode) {
            return res.status(400).send("QR Code tidak valid");
        }

        const userRef = db.ref(`users/${user.id}`);
        const snap = await userRef.get();
        const userData = snap.exists() ? snap.val() : {};

        // tandai booth dikunjungi
        await userRef.child(`booths_visited/${boothCode}`).set(true);

        // hitung ulang visited count
        const visitedCount = Object.keys({
            ...(userData.booths_visited || {}),
            [boothCode]: true,
        }).length;

        await userRef.update({
            visited_count: visitedCount,
            reward_ready: visitedCount >= 5,
        });

        res.redirect(`/booth/${boothCode}`);
    } catch (err) {
        console.error("Error handle scan:", err);
        res.status(500).send("Internal Server Error");
    }
};
