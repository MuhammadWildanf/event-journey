import express from "express";
import { showScan, handleScanResult } from "../controllers/scanController.js";

const router = express.Router();

// middleware proteksi login
function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    next();
}

// tampilkan halaman scan
router.get("/scan", requireLogin, showScan);

// endpoint POST untuk menerima hasil scan (QR code)
router.post("/scan", requireLogin, handleScanResult);

export default router;
