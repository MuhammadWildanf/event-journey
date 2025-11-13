import { db } from "../server.js";

export const showDashboard = async (req, res) => {
    try {
        const user = req.session.user;

        if (!user) {
            return res.redirect("/login");
        }

        // ambil data user dari Firebase
        const snap = await db.ref(`users/${user.id}`).get();
        const userData = snap.exists() ? snap.val() : {};

        res.render("dashboard", {
            user: {
                name: userData.name || "User",
                email: userData.email || "-",
                booths_visited: userData.booths_visited || {},
                visited_count: userData.visited_count || 0,
                reward_ready: userData.reward_ready || false,
                reward_claimed: userData.reward_claimed || false,
            },
        });
    } catch (err) {
        console.error("Error loading dashboard:", err);
        res.status(500).send("Internal Server Error");
    }
};
