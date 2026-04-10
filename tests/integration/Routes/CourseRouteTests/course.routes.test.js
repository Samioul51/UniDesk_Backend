import { jest } from "@jest/globals";
import request from "supertest";
import {
    connectTestDB,
    clearTestDB,
    disconnectTestDB
} from "../../setup/setupTestDB.js";
import {
    adminEmail,
    buildAdmin,
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

const authHeader = (token = "valid-token") => ({
    Authorization: `Bearer ${token}`,
});

describe("Course Routes Integration", () => {
    beforeAll(async () => {
        process.env.TZ = "Asia/Dhaka";
        await connectTestDB();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        await clearTestDB([Course, User]);
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    it("POST /api/courses allows a faculty to create a course", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: facultyEmail });

        const faculty = await User.create(buildFaculty());

        const res = await request(app).post("/api/courses").set(authHeader()).send({
            courseCode: "CSE 3200",
            courseName: "System Development Project",
            description: "Backend engineering",
            session: "2023-2024",
            year: "3rd",
            semester: "2nd",
            department: "cse",
        });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.course.courseCode).toBe("CSE 3200");
        expect(res.body.course.faculties[0]).toBe(faculty._id.toString());
        expect(res.body.invitationLink).toContain("/join-course?code=");
    });

    it("POST /api/courses blocks non-faculty users", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        await User.create(buildStudent());

        const res = await request(app).post("/api/courses").set(authHeader()).send({
            courseCode: "CSE 3200",
            courseName: "System Development Project",
            description: "Backend engineering",
            session: "2023-2024",
            year: "3rd",
            semester: "2nd",
            department: "cse",
        });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Forbidden access");
    });

    it("POST /api/courses/student/join allows a student to join with a valid invitation code", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        const student = await User.create(buildStudent());
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
            classLink: "https://meet.jit.si/UniDesk-course-1",
        });

        const res = await request(app).post("/api/courses/student/join?invitationCode=join123abc45").set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Joined course successfully");

        const updatedCourse = await Course.findById(course._id);
        expect(updatedCourse.students.map(String)).toContain(student._id.toString());
    });

    it("POST /api/courses/student/join blocks already enrolled students", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        const student = await User.create(buildStudent());
        const faculty = await User.create(buildFaculty());

        await Course.create({
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
            classLink: "https://meet.jit.si/UniDesk-course-2",
        });

        const res = await request(app).post("/api/courses/student/join?invitationCode=join123abc45").set(authHeader());

        expect(res.status).toBe(409);
        expect(res.body.message).toBe("Already enrolled in this course");
    });

    it("GET /api/courses/my-courses returns the current student's courses", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        const student = await User.create(buildStudent());
        const faculty = await User.create(buildFaculty());

        await Course.create([
            {
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
                status: "active",
                classLink: "https://meet.jit.si/UniDesk-course-3",
            },
            {
                courseCode: "CSE 3211",
                courseName: "Compiler Design",
                description: "Compiler theory",
                session: "2023-2024",
                year: "3rd",
                semester: "2nd",
                department: "cse",
                faculties: [faculty._id],
                students: [student._id],
                invitationCode: "join123abc46",
                status: "completed",
                classLink: "https://meet.jit.si/UniDesk-course-4",
            },
        ]);

        const res = await request(app).get("/api/courses/my-courses").set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.activeCourses).toHaveLength(1);
        expect(res.body.completedCourses).toHaveLength(1);
    });

    it("PATCH /api/courses/:id allows the owner faculty to update a course", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: facultyEmail });

        const faculty = await User.create(buildFaculty());

        const course = await Course.create({
            courseCode: "CSE 3200",
            courseName: "System Development Project",
            description: "Old description",
            session: "2023-2024",
            year: "3rd",
            semester: "2nd",
            department: "cse",
            faculties: [faculty._id],
            invitationCode: "join123abc45",
            classLink: "https://meet.jit.si/UniDesk-course-5",
        });

        const res = await request(app).patch(`/api/courses/${course._id}`).set(authHeader()).send({
            description: "Updated description",
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.course.description).toBe("Updated description");
    });

    it("PATCH /api/courses/:id blocks updates for completed courses", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: facultyEmail });

        const faculty = await User.create(buildFaculty());

        const course = await Course.create({
            courseCode: "CSE-3200",
            courseName: "System Project",
            description: "Old description",
            session: "2021-22",
            year: "3rd",
            semester: "2nd",
            department: "cse",
            faculties: [faculty._id],
            invitationCode: "join123abc45",
            status: "completed",
            classLink: "https://meet.jit.si/UniDesk-course-6",
        });

        const res = await request(app).patch(`/api/courses/${course._id}`).set(authHeader()).send({
            description: "Updated description",
        });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Completed course cannot be updated");
    });

    it("DELETE /api/courses/:id/student/leave allows an enrolled student to leave", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        const student = await User.create(buildStudent());
        const faculty = await User.create(buildFaculty());

        const course = await Course.create({
            courseCode: "CSE-3200",
            courseName: "System Project",
            description: "Backend engineering",
            session: "2021-22",
            year: "3rd",
            semester: "2nd",
            department: "cse",
            faculties: [faculty._id],
            students: [student._id],
            invitationCode: "join123abc45",
            classLink: "https://meet.jit.si/UniDesk-course-7",
        });

        const res = await request(app).delete(`/api/courses/${course._id}/student/leave`).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Left course successfully");

        const updatedCourse = await Course.findById(course._id);
        expect(updatedCourse.students.map(String)).not.toContain(student._id.toString());
    });

    it("DELETE /api/courses/:courseId/students/:studentId allows a faculty to remove an enrolled student", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: facultyEmail });

        const faculty = await User.create(buildFaculty());
        const student = await User.create(buildStudent());

        const course = await Course.create({
            courseCode: "CSE-3200",
            courseName: "System Project",
            description: "Backend engineering",
            session: "2021-22",
            year: "3rd",
            semester: "2nd",
            department: "cse",
            faculties: [faculty._id],
            students: [student._id],
            invitationCode: "join123abc45",
            classLink: "https://meet.jit.si/UniDesk-course-8",
        });

        const res = await request(app).delete(`/api/courses/${course._id}/students/${student._id}`).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Student removed from course successfully");

        const updatedCourse = await Course.findById(course._id);
        expect(updatedCourse.students.map(String)).not.toContain(student._id.toString());
    });

    it("GET /api/admin/courses allows admin to fetch all courses", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: adminEmail });

        const admin = await User.create(buildAdmin());
        const faculty = await User.create(buildFaculty());

        await Course.create({
            courseCode: "CSE-3200",
            courseName: "System Project",
            description: "Backend engineering",
            session: "2021-22",
            year: "3rd",
            semester: "2nd",
            department: "cse",
            faculties: [faculty._id],
            invitationCode: "join123abc45",
            classLink: "https://meet.jit.si/UniDesk-course-9",
        });

        const res = await request(app).get("/api/admin/courses").set(authHeader());

        expect(admin.email).toBe(adminEmail);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.courses).toHaveLength(1);
    });
});
