import { jest } from "@jest/globals";
import request from "supertest";
import {
    clearTestDB,
    connectTestDB,
    disconnectTestDB
} from "../../setup/setupTestDB.js";
import {
    buildFaculty,
    buildOtherStudent,
    buildStudent,
    facultyEmail,
    otherStudentEmail,
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
const { Announcement } = await import(
    "../../../../src/models/AnnouncementModel/announcement.model.js"
);

const authHeader = (token = "valid-token") => ({
    Authorization: `Bearer ${token}`,
});

describe("Announcement Routes Integration", () => {
    beforeAll(async () => {
        await connectTestDB();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        await clearTestDB([Announcement, Course, User]);
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    it("POST /api/course/:id/announcement allows a course faculty to create an announcement", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: facultyEmail });

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
        });

        const res = await request(app).post(`/api/course/${course._id}/announcement`).set(authHeader()).send({
            title: "Class Test",
            description: "Class test on Sunday",
        });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.announcement.title).toBe("Class Test");

        const announcement = await Announcement.findOne({ course: course._id });
        expect(announcement).not.toBeNull();
    });

    it("POST /api/course/:id/announcement blocks outsider faculty", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: facultyEmail });

        const faculty = await User.create(buildFaculty());
        const otherFaculty = await User.create(
            buildFaculty({ email: "other@cse.kuet.ac.bd" })
        );

        const course = await Course.create({
            courseCode: "CSE 3200",
            courseName: "System Development Project",
            description: "Backend engineering",
            session: "2023-2024",
            year: "3rd",
            semester: "2nd",
            department: "cse",
            faculties: [otherFaculty._id],
            invitationCode: "join123abc45",
        });

        const res = await request(app).post(`/api/course/${course._id}/announcement`).set(authHeader()).send({
            title: "Class Test",
            description: "Class test on Sunday",
        });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("You are not a faculty of this course");

        const count = await Announcement.countDocuments();
        expect(count).toBe(0);
        expect(faculty.email).toBe(facultyEmail);
    });

    it("PATCH /api/course/:courseID/announcement/:announcementID allows the owner faculty to update an announcement", async () => {
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
            invitationCode: "join123abc45"
        });

        const announcement = await Announcement.create({
            course: course._id,
            title: "Old Title",
            description: "Old description",
            faculty: faculty._id,
        });

        const res = await request(app).patch(`/api/course/${course._id}/announcement/${announcement._id}`).set(authHeader()).send({
            title: "Updated Title",
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.announcement.title).toBe("Updated Title");
    });

    it("PATCH /api/course/:courseID/announcement/:announcementID blocks non-owner faculty", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: facultyEmail });

        const ownerFaculty = await User.create(
            buildFaculty({ email: "owner@cse.kuet.ac.bd" })
        );
        const actingFaculty = await User.create(buildFaculty());

        const course = await Course.create({
            courseCode: "CSE 3200",
            courseName: "System Development Project",
            description: "Backend engineering",
            session: "2023-2024",
            year: "3rd",
            semester: "2nd",
            department: "cse",
            faculties: [ownerFaculty._id, actingFaculty._id],
            invitationCode: "join123abc45"
        });

        const announcement = await Announcement.create({
            course: course._id,
            title: "Old Title",
            description: "Old description",
            faculty: ownerFaculty._id,
        });

        const res = await request(app).patch(`/api/course/${course._id}/announcement/${announcement._id}`).set(authHeader()).send({
            title: "Updated Title",
        });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("You can only update your own announcements");
    });

    it("GET /api/course/:id/announcements allows a course student to fetch announcements", async () => {
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
            invitationCode: "join123abc45"
        });

        await Announcement.create({
            course: course._id,
            title: "Announcement 1",
            description: "Details",
            faculty: faculty._id,
        });

        const res = await request(app).get(`/api/course/${course._id}/announcements`).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.count).toBe(1);
    });

    it("GET /api/course/:id/announcements blocks outsiders", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: otherStudentEmail });

        const faculty = await User.create(buildFaculty());
        await User.create(buildStudent());
        await User.create(buildOtherStudent());

        const course = await Course.create({
            courseCode: "CSE 3200",
            courseName: "System Development Project",
            description: "Backend engineering",
            session: "2023-2024",
            year: "3rd",
            semester: "2nd",
            department: "cse",
            faculties: [faculty._id],
            students: [],
            invitationCode: "join123abc45"
        });

        const res = await request(app).get(`/api/course/${course._id}/announcements`).set(authHeader());

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("You are not involved in this course");
    });

    it("DELETE /api/course/announcement/:id allows the owner faculty to delete an announcement", async () => {
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
        });

        const announcement = await Announcement.create({
            course: course._id,
            title: "Announcement 1",
            description: "Details",
            faculty: faculty._id,
            attachments: [
                {
                    url: "https://example.com/file.pdf",
                    cloudinaryId: "cloud-1",
                    resourceType: "raw",
                },
            ],
        });

        const res = await request(app).delete(`/api/course/announcement/${announcement._id}`).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Announcement deleted successfully");

        const deleted = await Announcement.findById(announcement._id);
        expect(deleted).toBeNull();
    });
});
