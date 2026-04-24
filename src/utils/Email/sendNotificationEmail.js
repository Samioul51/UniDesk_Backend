import { formatName } from "../FormatName/formatName.js";
import { sendEmail } from "./sendEmail.js";

export const sendNotificationEmail = async ({ user, title, message, redirectURL }) => {
    if (!user?.email) 
        return;

    const appUrl = process.env.LIVE_LINK || "http://localhost:5173";
    const fullUrl = redirectURL ? `${appUrl}${redirectURL}` : appUrl;

    const subject = title || "New notification from UniDesk";
    const text = `${message || "You have a new notification."}\n\nOpen: ${fullUrl}`;

    const html = `
        <div style="font-family: Arial, sans-serif; line-height:1.6; color:#222;">
            <h2>${title || "New Notification"}</h2>
            <p>Hello ${formatName(user.name) || "User"},</p>
            <p>${message || "You have a new notification in UniDesk."}</p>
            <p>
                <a href="${fullUrl}" style="display:inline-block;padding:10px 16px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;">
                    Open UniDesk
                </a>
            </p>
        </div>
    `;

    await sendEmail({
        to: user.email,
        subject,
        text,
        html
    });
};
