import {
    handleLunchScan,
    handleSouvenirScan, handleGameScan,
    showguestbook, handledoorprize, handlegrandprize, handledoorprize1,handlegrandprize1
} from "./serviceController.js";
import {
    handleCheckin
} from "./checkinController.js";
import {
    boothSockets
} from "../server.js";
import { db } from "../config/firebase.js";


function normalizeBoothKey(str) {
    return str
        .toLowerCase()
        .normalize("NFD") // hilangkan karakter aneh
        .replace(/[\u0300-\u036f]/g, "") //
        .replace(/&/g, "and") // ganti karakter simbol
        .replace(/[^a-z0-9]+/g, "_") // semua non alfanumerik jadi _
        .replace(/_+/g, "_") // fix underscore berlebih
        .replace(/^_+|_+$/g, ""); // trim underscore
}


export const showScan = (req, res) => {
    const user = req.session.user;
    if (!user) return res.redirect("/login");
    res.render("scan", {
        user
    });
};


export const handleScanResult = async (req, res) => {
    try {
        const {
            boothCode,
            redirect
        } = req.body;
        const user = req.session.user;

        if (!boothCode) {
            return res.json({
                success: false,
                message: "Invalid QR code."
            });
        }

        // Normalisasi QR
        const code = boothCode.toLowerCase();
        const boothKey = normalizeBoothKey(boothCode);

        const SCAN_ACTIONS = {
            checkin: handleCheckin,
            lunch: handleLunchScan,
            // souvenir: handleSouvenirScan,
            contract_dalgona: handleGameScan,
            scm_glass_bridge: handleGameScan,
            memory_game: handleGameScan,
            guestbook: showguestbook,
            doorprize: handledoorprize,
            doorprize1: handledoorprize1,
            grandprize: handlegrandprize,
            grandprize1: handlegrandprize1
        };


        if (code === "guestbook") {
            return res.json({
                success: true,
                message: "Redirecting to guestbook...",
                redirect: "/guestbook"
            });
        }

        if (typeof SCAN_ACTIONS[code] === "function") {
            req.body.code = code;
            return SCAN_ACTIONS[code](req, res);
        }

        const isPhotobooth = boothKey === "photobooth";  // Cek jika photobooth

        if (isPhotobooth) {
            console.log("Photobooth detected. Searching for socket...");

            // Coba ambil socket dengan boothKey
            const socket = boothSockets["photobooth"] || boothSockets[boothKey];
            if (!socket) {
                return res.json({
                    success: false,
                    message: "Photobooth socket not found."
                });
            }

            // Kirim user_id ke Unity melalui WebSocket
            socket.send(JSON.stringify({
                event: "userLinked",
                user_id: user.id  // Kirim user_id yang diterima dari QR
            }));

            return res.json({
                success: true,
                message: "Redirecting to Photobooth...",
                redirect: "/photobooth"
            });
        }

        // =====================================
        // 🔵 BOOTH SCANNING — GET BOOTH NAME
        // =====================================
        const boothsSnap = await db.ref("booths").child(boothKey).get();

        if (!boothsSnap.exists()) {
            return res.json({
                success: false,
                message: "Booth not found."
            });
        }

        const boothData = boothsSnap.val();
        const boothName = boothData.name || boothKey;

        // =====================================
        // 🔵 Tandai visited
        // =====================================
        const userRef = db.ref(`users/${user.id}`);

        await userRef.child(`booths_visited/${boothKey}`).set(true);

        const snap = await userRef.child("booths_visited").get();
        const count = snap.exists() ? Object.keys(snap.val()).length : 0;

        await userRef.update({
            visited_count: count,
            reward_ready: count >= 8 // Updated to match souvenir requirement
        });

        // =====================================
        // 🔥 Response memakai NAMA BOOTH
        // =====================================
        return res.json({
            success: true,
            message: `Successfully visited booth ${boothName}.`,
            boothName,
            redirect: `/booth/${boothKey}`
        });

    } catch (err) {
        console.error("Scan error:", err);
        return res.json({
            success: false,
            message: "Server error occurred."
        });
    }
};