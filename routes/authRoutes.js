import express from "express";
import {
    showLogin,
    showRegister,
    registerUser,
    loginUser,
    logoutUser,resetPassword,showresetPassword
} from "../controllers/authController.js";

const router = express.Router();

router.get("/login", showLogin);
router.get("/register", showRegister);

router.post("/login", loginUser);
router.post("/register", registerUser);

router.post("/logout", logoutUser);

router.get("/reset-password", showresetPassword)
router.post("/reset-password", resetPassword)

router.get("/comingsoon", (req, res) => {
    res.render("comingsoon");
});

export default router;
