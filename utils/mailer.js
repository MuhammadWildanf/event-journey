import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, text = "", html = "") => {
    try {
        console.log("🔌 Connecting to SMTP...");

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,     // smtp.mailersend.net
            port: 587,
            secure: false,                   // Wajib false
            auth: {
                user: process.env.SMTP_USER, // MS_xxxxx@scmdigitalday2025.com
                pass: process.env.SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM,     // langsung, TIDAK pakai tambahan name
            to,
            subject,
            html,
        });

        console.log("📧 Email sent:", info);
        return true;

    } catch (err) {
        console.error("❌ SMTP ERROR:", err);
        return false;
    }
};
