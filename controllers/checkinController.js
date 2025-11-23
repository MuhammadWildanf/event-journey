import { db } from "../config/firebase.js";
import { getToday } from "../utils/date.js";

export const handleCheckin = async (req, res) => {
    try {
        const user = req.session.user;
        const { code } = req.body;
        const today = getToday(); // "2025-11-18"

        if (code !== "checkin") {
            return res.status(400).json({
                success: false,
                message: "Invalid check-in QR code."
            });
        }

        const userRef = db.ref(`users/${user.id}`);
        const snap = await userRef.get();
        const userData = snap.val() || {};

        // 1. CEK SUDAH PERNAH CHECK-IN HARI INI
        if (userData.checkin_dates?.[today]) {
            return res.status(400).json({
                success: false,
                message: "You have already checked in today."
            });
        }

        // 2. HITUNG URUTAN CHECK-IN
        const countRef = db.ref(`services/checkin/today_count/${today}`);
        const countSnap = await countRef.get();
        const countToday = countSnap.val() || 0;

        const newOrder = countToday + 1;

        // 3. SIMPAN DATA CHECK-IN USER
        await userRef.update({
            [`checkin_dates/${today}`]: true,
            [`checkin_order/${today}`]: newOrder
        });

        // 4. UPDATE JUMLAH CHECK-IN HARIAN
        await countRef.set(newOrder);

        // 5. BALIKKAN JSON SUKSES (TANPA URUTAN)
        return res.json({
            success: true,
            message: "Check-in successful."
        });

    } catch (err) {
        console.error("Checkin error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};
