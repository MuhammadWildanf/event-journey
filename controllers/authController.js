import { db } from "../server.js";

export const showRegister = (req, res) => {
    res.render("auth/register");
};

export const showLogin = (req, res) => {
    res.render("auth/login");
};

export const registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).send("Semua field wajib diisi!");
    }

    const usersSnap = await db.ref("users").get();
    let exists = false;
    usersSnap.forEach((child) => {
        if (child.val().email === email) exists = true;
    });

    if (exists) {
        return res.status(409).send("Email sudah terdaftar!");
    }

    const ref = db.ref("users").push();
    await ref.set({
        name,
        email,
        password,
        booths_visited: {},      // 🆕 mulai kosong
        visited_count: 0,        // 🆕 0 awal
        reward_ready: false,     // 🆕 belum siap reward
        reward_claimed: false,   // 🆕 belum klaim reward
        created_at: new Date().toISOString(),
    });

    req.session.user = { id: ref.key, name, email };

    // Jika request dari fetch()
    if (req.headers["content-type"]?.includes("application/json")) {
        return res.status(200).json({ success: true });
    }

    res.redirect("/comingsoon");
};



export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send("Isi semua field!");
    }

    const snap = await db.ref("users").get();
    let user = null;
    snap.forEach((child) => {
        const u = child.val();
        if (u.email === email && u.password === password) {
            user = { id: child.key, ...u };
        }
    });

    if (!user) {
        return res.status(401).send("Email atau password salah!");
    }

    req.session.user = { id: user.id, name: user.name, email: user.email };

    // Deteksi apakah ini fetch() atau form normal
    if (req.headers["content-type"]?.includes("application/json")) {
        return res.status(200).json({ success: true });
    }

    res.redirect("/comingsoon");
};


export const logoutUser = (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
};
