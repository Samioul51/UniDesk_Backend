import { jest } from "@jest/globals";
import request from "supertest";
import {
    clearTestDB,
    connectTestDB,
    disconnectTestDB
} from "../../setup/setupTestDB.js";
import {
    buildFaculty,
    buildStudent,
    facultyEmail,
    studentEmail
} from "../../helpers/userSeed.js";

const verifyIdTokenMock = jest.fn();
const deleteFromCloudinaryMock = jest.fn();
const emitMock = jest.fn();
const toMock = jest.fn(() => ({ emit: emitMock }));

jest.unstable_mockModule("../../../../src/utils/Firebase/firebase.js", () => ({
    auth: {
        verifyIdToken: verifyIdTokenMock,
    },
}));

jest.unstable_mockModule(
    "../../../../src/utils/DeleteFromCloudinary/deleteFromCloudinary.js",
    () => ({
        deleteFromCloudinary: deleteFromCloudinaryMock,
    })
);

jest.unstable_mockModule("../../../../src/index.js", () => ({
    io: {
        to: toMock,
        emit: emitMock,
    },
}));

const { default: app } = await import("../../../../src/app.js");
const { User } = await import("../../../../src/models/UserModel/user.model.js");
const { Course } = await import("../../../../src/models/CourseModel/course.model.js");
const { Material } = await import(
    "../../../../src/models/StudyMaterialModel/material.model.js"
);

const authHeader = () => ({
    Authorization: "Bearer valid-token",
});

describe("Material Routes Integration", () => {
    beforeAll(async () => {
        await connectTestDB();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        deleteFromCloudinaryMock.mockResolvedValue({ result: "ok" });
        await clearTestDB([Material, Course, User]);
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    it("POST /api/course/:id/material allows faculty to upload material", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: facultyEmail });

        const faculty = await User.create(buildFaculty());

        const course = await Course.create({
            courseCode: "CSE 3200",
            courseName: "System Development Project",
            description: "Backend engineering",
            session: "2023-2024",
            year: "3rd",
            semester: "2nd",
            department: "cse",
            faculties: [faculty._id],
            invitationCode: "join123abc45",
            classLink: "https://meet.jit.si/UniDesk-material-1",
        });

        const res = await request(app)
            .post(`/api/course/${course._id}/material`)
            .set(authHeader())
            .send({
                title: "Week 1 Slides",
                description: "Introduction",
                url: "https://example.com/material.pdf",
                cloudinaryId: "cloud-1",
                resourceType: "raw",
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Material uploaded successfully");
    });

    it("GET /api/course/:id/materials allows a course student to view materials", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        const faculty = await User.create(buildFaculty());
        const student = await User.create(buildStudent());

        const course = await Course.create({
            courseCode: "CSE 3200",
            courseName: "System Development Project",
            description: "Backend engineering",
            session: "2023-2024",
            year: "3rd",
            semester: "2nd",
            department: "cse",
            faculties: [faculty._id],
            students: [student._id],
            invitationCode: "join123abc45",
            classLink: "https://meet.jit.si/UniDesk-material-2",
        });

        await Material.create({
            course: course._id,
            title: "Week 1 Slides",
            description: "Introduction",
            url: "https://example.com/material.pdf",
            cloudinaryId: "cloud-1",
            resourceType: "raw",
            uploader: faculty._id,
        });

        const res = await request(app).get(`/api/course/${course._id}/materials`).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.materials).toHaveLength(1);
    });

    it("DELETE /api/course/material/:id allows faculty to delete material", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: facultyEmail });
        deleteFromCloudinaryMock.mockResolvedValue({ result: "ok" });

        const faculty = await User.create(buildFaculty());

        const course = await Course.create({
            courseCode: "CSE 3200",
            courseName: "System Development Project",
            description: "Backend engineering",
            session: "2023-2024",
            year: "3rd",
            semester: "2nd",
            department: "cse",
            faculties: [faculty._id],
            invitationCode: "join123abc45",
            classLink: "https://meet.jit.si/UniDesk-material-3",
        });

        const material = await Material.create({
            course: course._id,
            title: "Week 1 Slides",
            description: "Introduction",
            url: "https://example.com/material.pdf",
            cloudinaryId: "cloud-1",
            resourceType: "raw",
            uploader: faculty._id,
        });

        const res = await request(app).delete(`/api/course/material/${material._id}`).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Material deleted successfully");
    });
});
