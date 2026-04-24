import crypto from "crypto";

export const createMeeting = () => {
    const meetingId = crypto.randomBytes(4).slice(0, 8); 
    return `https://meet.jit.si/UniDesk-${meetingId}`;
};