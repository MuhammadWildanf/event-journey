import express from "express";
import {
    showLunch,
    showSouvenir,
    showPhotobooth,
    showGames,
    handleSouvenirScan,
    handleLunchScan,
    uploadPhoto,
    showguestbook,
    handleguesbook,
    showDoorprize,
    handledoorprize, showGrandprize,
    handlegrandprize,
    viewDoorprize1,handledoorprize1,viewgrandprize1,handlegrandprize1,resetDoorprize1,resetGrandprize1

} from "../controllers/serviceController.js";

const router = express.Router();

function requireLogin(req, res, next) {
    if (!req.session?.user) return res.redirect("/login");
    next();
}

router.get("/lunch", requireLogin, showLunch);
router.get("/souvenir", requireLogin, showSouvenir);

router.get("/games", requireLogin, showGames);

// 🔥 HALAMAN SUCCESS (harus ditambahkan!)
router.get("/lunch-success", requireLogin, (req, res) => {
    res.render("services/lunch-success", { user: req.session.user });
});

router.get("/souvenir-success", requireLogin, (req, res) => {
    res.render("services/souvenir-success", { user: req.session.user });
});

// 🔥 HANDLE SCAN POST
router.post("/scan-lunch/result", requireLogin, handleLunchScan);
router.post("/scan-souvenir/result", requireLogin, handleSouvenirScan);


router.get("/photobooth", requireLogin, showPhotobooth);
router.post("/photobooth/upload", uploadPhoto);


router.get("/guestbook", requireLogin, showguestbook);
router.post("/guestbook/submit-form", requireLogin, handleguesbook);


router.get("/doorprize", showDoorprize);
router.post("/doorprize", requireLogin, handledoorprize);


router.get("/grandprize", showGrandprize);
router.get("/grandprize", requireLogin, handlegrandprize);



router.get("/doorprize1", viewDoorprize1);
router.post("/doorprize1", handledoorprize1);

router.get("/grandprize1", viewgrandprize1);
router.post("/grandprize1", handlegrandprize1);


router.post("/reset/doorprize1", resetDoorprize1);
router.post("/reset/grandprize1", resetGrandprize1);

export default router;
