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
    userUpdatePassword,
    userExportCSV,
    userReset,
    userUpdateStatus,
    quotaSettings, quotaUpdate,
    serviceList,
    serviceCreateForm,
    serviceCreate,
    serviceEditForm,
    serviceUpdate,
    serviceDelete, quotaLunchDetail,quotaSouvenirDetail
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
router.post("/users/:id/password", userUpdatePassword);
router.get("/users/:id/delete", userDelete);
router.post("/users/:id/reset", userReset);
router.post("/users/:id/status", userUpdateStatus);


router.get("/quota", quotaSettings);
router.post("/quota", quotaUpdate);
router.get("/quota/lunch/detail", quotaLunchDetail);
router.get("/quota/souvenir/detail", quotaSouvenirDetail);


router.get("/services", serviceList);
router.get("/services/create", serviceCreateForm);
router.post("/services/create", serviceCreate);
router.get("/services/:id/edit", serviceEditForm);
router.post("/services/:id/edit", serviceUpdate);
router.get("/services/:id/delete", serviceDelete);

export default router;
