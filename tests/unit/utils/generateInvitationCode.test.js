import { generateInvitationCode } from "../../../src/utils/InvitationCode/generateInvitationCode.js";


describe("generateInvitationCode",()=>{

    // 12 character checking test

    it("Returns 12 character course invitation code",()=>{
        const code=generateInvitationCode();

        expect(code).toMatch(/^[a-f0-9]{12}$/);
    });

    // Uniqueness code check for 2 codes

    it("Returns different course invitation codes on multiple calls",()=>{
        const code1=generateInvitationCode();
        const code2=generateInvitationCode();

        expect(code1).not.toBe(code2);
    });
});