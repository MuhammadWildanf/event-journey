import { db } from "../server.js";

export const showLunch = async (req, res) => {
    const user = req.session.user;

    // Data bisa ambil dari Firebase jika butuh
    const userSnap = await db.ref("users/" + user.id).get();
    const userData = userSnap.exists() ? userSnap.val() : {};

    res.render("services/lunch", { user, userData });
};

export const showSouvenir = async (req, res) => {
    const user = req.session.user;

    const userSnap = await db.ref("users/" + user.id).get();
    const userData = userSnap.exists() ? userSnap.val() : {};

    res.render("services/souvenir", { user, userData });
};

export const showPhotobooth = async (req, res) => {
    const user = req.session.user;

    res.render("services/photobooth", { user });
};

export const showGames = async (req, res) => {
    const user = req.session.user;

    res.render("services/games", { user });
};
