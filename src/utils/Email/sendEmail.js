import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

export const sendEmail = async ({ to, subject, text, html }) => {
    if (!to) 
        return;

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS)
        throw new Error("SMTP configuration is incomplete");

    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        text,
        html
    });
};
