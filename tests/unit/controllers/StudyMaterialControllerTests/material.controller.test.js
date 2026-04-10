import { jest } from "@jest/globals";

const courseModelMock = {
    findById: jest.fn(),
};

const materialModelMock = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    deleteOne: jest.fn(),
};

const notifyUsersMock = jest.fn();
const deleteFromCloudinaryMock = jest.fn();
const validateFileResourceTypeMock = jest.fn();

jest.unstable_mockModule(
    "../../../../src/models/CourseModel/course.model.js",
    () => ({
        Course: courseModelMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/models/StudyMaterialModel/material.model.js",
    () => ({
        Material: materialModelMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/utils/NotificationEngine/notificationService.js",
    () => ({
        notifyUsers: notifyUsersMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/utils/DeleteFromCloudinary/deleteFromCloudinary.js",
    () => ({
        deleteFromCloudinary: deleteFromCloudinaryMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/utils/CloudinaryValidation/cloudinaryValidation.js",
    () => ({
        validateFileResourceType: validateFileResourceTypeMock,
    })
);

const {
    uploadMaterial,
    courseMaterials,
    deleteMaterial,
} = await import(
    "../../../../src/controllers/StudyMaterialController/material.controller.js"
);

const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe("MaterialController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        notifyUsersMock.mockResolvedValue();
        deleteFromCloudinaryMock.mockResolvedValue();
    });

    describe("uploadMaterial", () => {

        // Blocking material upload if course is invalid test

        it("returns 404 when course is not found", async () => {
            courseModelMock.findById.mockResolvedValue(null);

            const req = {
                params: { id: "course-1" },
                dbUser: { _id: "faculty-1" },
                body: {
                    title: "Week 1 Slides",
                    description: "Introduction",
                    url: "https://example.com/file.pdf",
                    cloudinaryId: "cloud-1",
                    resourceType: "raw",
                },
            };
            const res = createMockRes();

            await uploadMaterial(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Course not found",
            });
        });

        // Blocking study material upload if user is not faculty test

        it("returns 403 when requester is not a faculty of the course", async () => {
            courseModelMock.findById.mockResolvedValue({
                faculties: [{ toString: () => "faculty-2" }],
                students: [],
            });

            const req = {
                params: { id: "course-1" },
                dbUser: { _id: "faculty-1" },
                body: {
                    title: "Week 1 Slides",
                    description: "Introduction",
                    url: "https://example.com/file.pdf",
                    cloudinaryId: "cloud-1",
                    resourceType: "raw",
                },
            };
            const res = createMockRes();

            await uploadMaterial(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "You are not teaching this course",
            });
        });

        // Blocking study material upload for invalid resource type

        it("returns 400 when resource type is invalid", async () => {
            courseModelMock.findById.mockResolvedValue({
                faculties: [{ toString: () => "faculty-1" }],
                students: [],
            });
            validateFileResourceTypeMock.mockReturnValue(false);

            const req = {
                params: { id: "course-1" },
                dbUser: { _id: "faculty-1" },
                body: {
                    title: "Week 1 Slides",
                    description: "Introduction",
                    url: "https://example.com/file.pdf",
                    cloudinaryId: "cloud-1",
                    resourceType: "doc",
                },
            };
            const res = createMockRes();

            await uploadMaterial(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Invalid resource type",
            });
        });
    });

    describe("courseMaterials", () => {

        // Blocking access for unauthorized user to get study materials test

        it("returns 403 when user is not part of the course", async () => {
            courseModelMock.findById.mockResolvedValue({
                faculties: [{ toString: () => "faculty-2" }],
                students: [{ toString: () => "student-2" }],
            });

            const req = {
                params: { id: "course-1" },
                dbUser: { _id: "student-1" },
            };
            const res = createMockRes();

            await courseMaterials(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "You are not authorized to get this course materials",
            });
        });
    });

    describe("deleteMaterial", () => {

        // Study material delete test

        it("deletes material successfully for a valid faculty", async () => {
            materialModelMock.findById.mockResolvedValue({
                _id: "material-1",
                course: "course-1",
                cloudinaryId: "cloud-1",
                resourceType: "raw",
            });

            courseModelMock.findById.mockResolvedValue({
                faculties: [{ toString: () => "faculty-1" }],
            });

            materialModelMock.deleteOne.mockResolvedValue({});

            const req = {
                params: { id: "material-1" },
                dbUser: { _id: "faculty-1" },
            };
            const res = createMockRes();

            await deleteMaterial(req, res);

            expect(deleteFromCloudinaryMock).toHaveBeenCalledWith("cloud-1", "raw");
            expect(materialModelMock.deleteOne).toHaveBeenCalledWith({
                _id: "material-1",
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Material deleted successfully",
            });
        });
    });
});
