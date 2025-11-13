import express from "express";
import { showDashboard } from "../controllers/dashboardController.js";

const router = express.Router();

// middleware sederhana untuk proteksi login
function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    next();
}

// tampilkan dashboard
router.get("/dashboard", requireLogin, showDashboard);

export default router;
