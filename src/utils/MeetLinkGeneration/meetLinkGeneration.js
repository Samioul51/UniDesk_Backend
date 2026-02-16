import { v4 as uuid } from "uuid";

export const createMeeting = () => {
    const meetingId = uuid().slice(0, 8); 
    return `https://meet.jit.si/UniDesk-${meetingId}`;
};