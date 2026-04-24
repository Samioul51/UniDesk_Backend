import crypto from "crypto";

export const createMeeting = () => {
    const meetingId = crypto.randomBytes(4).toString("hex"); 
    return `https://meet.jit.si/UniDesk-${meetingId}`;
};