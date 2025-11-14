import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, text, html) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    await transporter.sendMail({
        from: `"SCM Digital Day 2025" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
    });
};
