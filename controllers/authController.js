import {
    db
} from "../config/firebase.js";
import {
    sendRegistrationEmail
} from "../utils/sendRegistrationEmail.js";


export const showRegister = (req, res) => {
    res.render("auth/register");
};

export const showLogin = (req, res) => {
    res.render("auth/login");
};

export const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).send("All fields are required!");
    }

    // ❗ VALIDASI PASSWORD
    if (password.length < 6) {
        return res.status(400).send("Password must be at least 6 characters!");
    }

    if (password.length > 32) {
        return res.status(400).send("Password must be at most 32 characters!");
    }

    // CEK EMAIL SUDAH ADA
    const usersSnap = await db.ref("users").get();
    let exists = false;
    usersSnap.forEach((child) => {
        if (child.val().email === email) exists = true;
    });

    if (exists) {
        return res.status(409).send("Email is already registered!");
    }

    const ref = db.ref("users").push();
    await ref.set({
        name,
        email,
        password,  // ❗ tetap plaintext sesuai sistemmu
        checkin_dates: {},
        booths_visited: {},
        visited_count: 0,
        lunch_claimed_dates: {},
        souvenir_claimed_dates: {},
        photobooth_done: false,
        photobooth_images: {},
        games_done: false,
        reward_ready: false,
        reward_claimed: false,
        created_at: new Date().toISOString(),
    });

    req.session.user = { id: ref.key, name, email };

    try { await sendRegistrationEmail(name, email); } catch (e) { }

    req.session.save(() => {
        if (req.headers["content-type"]?.includes("application/json")) {
            return res.status(200).json({ success: true });
        }
        res.redirect("/dashboard");
    });
};




export const loginUser = async (req, res) => {
    const {
        email,
        password
    } = req.body;

    if (!email || !password) {
        return res.status(400).send("Please fill out all fields!");
    }

    const snap = await db.ref("users").get();
    let user = null;
    snap.forEach((child) => {
        const u = child.val();
        if (u.email === email && u.password === password) {
            user = {
                id: child.key,
                ...u
            };
        }
    });

    if (!user) {
        return res.status(401).send("Email or password is incorrect!");
    }

    req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email
    };

    // Deteksi apakah ini fetch() atau form normal
    req.session.save(() => {
        if (req.headers["content-type"]?.includes("application/json")) {
            return res.status(200).json({
                success: true
            });
        }
        // res.redirect("/comingsoon");
        res.redirect("/dashboard");

    });
};

export const showresetPassword = (req,res) => {
     res.render("auth/reset-password");
};


export const resetPassword = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).send("Email and password are required!");
    if (!/^\d+$/.test(password)) return res.status(400).send("Password must be numeric.");
    if (password.length < 6 || password.length > 32)
        return res.status(400).send("Password must be 6-32 digits.");

    const snap = await db.ref("users").get();
    let userKey = null;

    snap.forEach((child) => {
        if (child.val().email === email) userKey = child.key;
    });

    if (!userKey) return res.status(404).send("Email not found!");

    await db.ref(`users/${userKey}`).update({ password });

    res.status(200).send("Password has been reset successfully!");
};



export const logoutUser = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).json({ success: false, message: "Unable to logout. Please try again." });
        }

        res.clearCookie('connect.sid', { path: '/' });
        res.json({ success: true, message: "Logout successful" });
    });
};

