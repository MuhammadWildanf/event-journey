import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, text = "", html = "") => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,          // smtp.mailersend.net
            port: Number(process.env.SMTP_PORT),  // 587
            secure: false,                        // WAJIB false (STARTTLS)
            auth: {
                user: process.env.SMTP_USER,      // contoh MS_nRe19t@scmdigitalday2025.com
                pass: process.env.SMTP_PASS
            },
            tls: {
                ciphers: "SSLv3",
                rejectUnauthorized: false
            },
        });

        const info = await transporter.sendMail({
            from: `"SCM Digital Day 2025" <${process.env.MAIL_FROM}>`,
            to,
            subject,
            text,
            html,
        });

        console.log("📧 Email sent:", info.messageId);

        return true;
    } catch (err) {
        console.error("❌ Email send error:", err);
        return false;
    }
};
