import express from "express";
import {
    showLunch,
    showSouvenir,
    showPhotobooth,
    showGames
} from "../controllers/serviceController.js";

const router = express.Router();

router.get("/lunch", showLunch);
router.get("/souvenir", showSouvenir);
router.get("/photobooth", showPhotobooth);
router.get("/games", showGames);

export default router;
