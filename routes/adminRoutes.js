import express from "express";
import {
    adminDashboard,
    boothList,
    boothCreateForm,
    boothCreate,
    boothEditForm,
    boothUpdate,
    boothDelete,
    boothDetail,
    boothExportCSV,
    boothDownloadQR,

    userList,
    userDetail,
    userDelete,
    userUpdate,
    userExportCSV
} from "../controllers/adminController.js";

const router = express.Router();

// (Optional) tanpa login admin
// Bisa tambahkan password static di .env

router.get("/", adminDashboard);

/* BOOTH */
router.get("/booths", boothList);
router.get("/booths/create", boothCreateForm);
router.post("/booths/create", boothCreate);
router.get("/booths/:id/edit", boothEditForm);
router.post("/booths/:id/edit", boothUpdate);
router.get("/booths/:id/delete", boothDelete);
router.get("/booths/:id", boothDetail);
router.get("/booths/:id/download-qr", boothDownloadQR);
router.get("/export/booths", boothExportCSV);

/* USERS */
router.get("/users", userList);
router.get("/users/export", userExportCSV);
router.get("/users/:id", userDetail);
router.post("/users/:id/edit", userUpdate);
router.get("/users/:id/delete", userDelete);

export default router;
