import express from "express";
import { showBoothList, showBoothDetail, submitBoothReview } from "../controllers/boothController.js";

const router = express.Router();

// Middleware proteksi login
function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    next();
}

// 📍 Daftar semua booth
router.get("/booth", requireLogin, showBoothList);

// 📍 Detail 1 booth (misal: /booth/lunch atau /booth/2)
router.get("/booth/:type", requireLogin, showBoothDetail);

// 📩 Kirim review booth
router.post("/booth/:type/review", requireLogin, submitBoothReview);

export default router;
