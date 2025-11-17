import express from "express";
import { handleCheckin } from "../controllers/checkinController.js";

const router = express.Router();

function requireLogin(req, res, next) {
    if (!req.session?.user) return res.redirect("/login");
    next();
}

router.post("/scan-checkin/result", requireLogin, handleCheckin);

export default router;
