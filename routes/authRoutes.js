import express from "express";
import {
    showLogin,
    showRegister,
    registerUser,
    loginUser,
    logoutUser
} from "../controllers/authController.js";

const router = express.Router();

router.get("/login", showLogin);
router.get("/register", showRegister);

router.post("/login", loginUser);
router.post("/register", registerUser);

router.get("/logout", logoutUser);

router.get("/comingsoon", (req, res) => {
    res.render("comingsoon");
});

export default router;
