import { expect, jest } from "@jest/globals";

// Mock function

const destroyMock = jest.fn();

// Mock module creation to avoid real api call

jest.unstable_mockModule("../../../src/config/cloudinary/cloudinary.js", () => ({
    default: {
        uploader: {
            destroy: destroyMock,
        }
    }
}));


const { deleteFromCloudinary } = await import("../../../src/utils/DeleteFromCloudinary/deleteFromCloudinary.js");

describe("deleteFromCloudinary", () => {

    // Resets all mocks before every test run

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Checking public id is providing or not

    it("returns undefined when no public id is provided", async () => {
        const res = await deleteFromCloudinary();

        expect(res).toBeUndefined();
        expect(destroyMock).not.toHaveBeenCalled();
    });

    // To delete resource if valid resourse type is provided

    it("deletes resource using the provided valid resource type", async () => {
        destroyMock.mockResolvedValueOnce({ result: "ok" });

        const res = await deleteFromCloudinary("sample-id", "video");

        expect(destroyMock).toHaveBeenCalledWith("sample-id", {
            resource_type: "video"
        });

        expect(res).toEqual({ result: "ok" });
    });

    // Cloudinary deletion fail tackling testing

    it("returns null when cloudinary deletion fails", async()=>{
        destroyMock.mockRejectedValueOnce(new Error("Deletion failed"));

        const res=await deleteFromCloudinary("sample-id");

        expect(res).toBeNull();
    })
});
