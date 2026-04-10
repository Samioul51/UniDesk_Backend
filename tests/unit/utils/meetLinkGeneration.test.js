import { createMeeting } from "../../../src/utils/MeetLinkGeneration/meetLinkGeneration.js";


describe("createMeeting",()=>{

    // Jitsi meet link generation checking

    it("successfully creates Jitsi meeting link",()=>{
        const link=createMeeting();

        expect(link).toMatch(/^https:\/\/meet\.jit\.si\/UniDesk-[a-z0-9-]{8}$/i);
    });
});