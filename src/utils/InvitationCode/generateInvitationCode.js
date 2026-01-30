import crypto from "crypto";

export const generateInvitationCode=()=>{
    return crypto.randomBytes(6).toString("hex");
}