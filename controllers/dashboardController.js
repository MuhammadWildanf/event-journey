import {
    db
} from "../server.js";

export const showDashboard = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) return res.redirect("/login");

        const snap = await db.ref(`users/${user.id}`).get();
        const d = snap.exists() ? snap.val() : {};

        res.render("dashboard", {
            user: {
                id: user.id,
                name: d.name || "User",
                email: d.email || "-",

                // === BOOTH STATUS ===
                booths_visited: d.booths_visited || {},
                visited_count: d.visited_count || 0,

                // === CLAIMED STATUS ===
                lunch_claimed: d.lunch_claimed || false,
                souvenir_claimed: d.souvenir_claimed || false,
                photobooth_done: d.photobooth_done || false,

                // === GAME STATUS (kalau ada nanti)
                games_done: d.games_done || false,

                reward_ready: d.reward_ready || false,
                reward_claimed: d.reward_claimed || false,
            },
        });

    } catch (err) {
        console.error("Dashboard error:", err);
        res.status(500).send("Internal Server Error");
    }
};