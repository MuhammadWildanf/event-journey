import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, text = "", html = "") => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: false, // WAJIB false untuk port 587
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: false,
            }
        });

        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to,
            subject,
            text,
            html,
        });

        console.log("Email sent:", info.messageId);
        return true;
    } catch (err) {
        console.error("Email error:", err);
        return false;
    }
};
