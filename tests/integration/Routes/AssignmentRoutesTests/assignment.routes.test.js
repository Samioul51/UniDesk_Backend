import { jest } from "@jest/globals";
import request from "supertest";
import {
    clearTestDB,
    connectTestDB,
    disconnectTestDB,
} from "../../setup/setupTestDB.js";
import {
    buildFaculty,
    buildStudent,
    facultyEmail,
    studentEmail,
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
const { Assignment } = await import(
    "../../../../src/models/AssignmentModel/assignment.model.js"
);
const { Submission } = await import(
    "../../../../src/models/AssignmentSubmissionModel/submission.model.js"
);

const authHeader = () => ({
    Authorization: "Bearer valid-token",
});

describe("Assignment Routes Integration", () => {
    beforeAll(async () => {
        await connectTestDB();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        await clearTestDB([Submission, Assignment, Course, User]);
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    it("POST /api/course/:id/assignment allows faculty to upload an assignment", async () => {
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
            invitationCode: "join123abc45"
        });

        const res = await request(app).post(`/api/course/${course._id}/assignment`).set(authHeader()).send({
            title: "Assignment 1",
            description: "Build API",
            dueDate: "2099-05-20T10:00:00.000Z",
            totalMarks: 100,
        });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.assignment.title).toBe("Assignment 1");

        const assignment = await Assignment.findOne({ course: course._id });
        expect(assignment).not.toBeNull();
    });

    it("GET /api/course/:courseID/assignment/:assignmentID allows enrolled student to fetch assignment", async () => {
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

        const assignment = await Assignment.create({
            course: course._id,
            title: "Assignment 1",
            description: "Build API",
            dueDate: new Date("2099-05-20T10:00:00.000Z"),
            totalMarks: 100,
            createdBy: faculty._id,
        });

        const res = await request(app).get(`/api/course/${course._id}/assignment/${assignment._id}`).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.assignment.title).toBe("Assignment 1");
    });

    it("PATCH /api/assignment/:id allows course faculty to update assignment", async () => {
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

        const assignment = await Assignment.create({
            course: course._id,
            title: "Assignment 1",
            description: "Old description",
            dueDate: new Date("2099-05-20T10:00:00.000Z"),
            totalMarks: 100,
            createdBy: faculty._id,
        });

        const res = await request(app).patch(`/api/assignment/${assignment._id}`).set(authHeader()).send({
            description: "Updated description",
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.assignment.description).toBe("Updated description");
    });

    it("POST /api/assignment/:id/submit allows student to submit assignment", async () => {
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
        });

        const assignment = await Assignment.create({
            course: course._id,
            title: "Assignment 1",
            description: "Build API",
            dueDate: new Date("2099-05-20T10:00:00.000Z"),
            totalMarks: 100,
            createdBy: faculty._id,
        });

        const res = await request(app).post(`/api/assignment/${assignment._id}/submit`).set(authHeader()).send({
            submissionURL: "https://example.com/submission.pdf",
            cloudinaryId: "cloud-1",
            resourceType: "raw",
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Assignment submitted successfully");

        const submission = await Submission.findOne({ assignment: assignment._id });
        expect(submission).not.toBeNull();
    });

    it("POST /api/assignment/:id/submit blocks duplicate submission", async () => {
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

        const assignment = await Assignment.create({
            course: course._id,
            title: "Assignment 1",
            description: "Build API",
            dueDate: new Date("2099-05-20T10:00:00.000Z"),
            totalMarks: 100,
            createdBy: faculty._id,
        });

        await Submission.create({
            assignment: assignment._id,
            course: course._id,
            student: student._id,
            submissionURL: "https://example.com/submission.pdf",
            cloudinaryId: "cloud-1",
            resourceType: "raw",
        });

        const res = await request(app).post(`/api/assignment/${assignment._id}/submit`).set(authHeader()).send({
            submissionURL: "https://example.com/submission2.pdf",
            cloudinaryId: "cloud-2",
            resourceType: "raw",
        });

        expect(res.status).toBe(409);
        expect(res.body.message).toBe("You have already submitted this assignment");
    });

    it("PATCH /api/assignment/:id/submissions/:submissionId allows faculty to grade submission", async () => {
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

        const assignment = await Assignment.create({
            course: course._id,
            title: "Assignment 1",
            description: "Build API",
            dueDate: new Date("2099-05-20T10:00:00.000Z"),
            totalMarks: 100,
            createdBy: faculty._id,
        });

        const submission = await Submission.create({
            assignment: assignment._id,
            course: course._id,
            student: student._id,
            submissionURL: "https://example.com/submission.pdf",
            cloudinaryId: "cloud-1",
            resourceType: "raw",
        });

        const res = await request(app).patch(`/api/assignment/${assignment._id}/submissions/${submission._id}`).set(authHeader()).send({
            marks: 85,
            feedback: "Good job",
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.submission.marks).toBe(85);
        expect(res.body.submission.isGraded).toBe(true);
    });

    it("DELETE /api/submission/:id allows student to unsubmit before due date", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });
        deleteFromCloudinaryMock.mockResolvedValue({ result: "ok" });

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

        const assignment = await Assignment.create({
            course: course._id,
            title: "Assignment 1",
            description: "Build API",
            dueDate: new Date("2099-05-20T10:00:00.000Z"),
            totalMarks: 100,
            createdBy: faculty._id,
        });

        const submission = await Submission.create({
            assignment: assignment._id,
            course: course._id,
            student: student._id,
            submissionURL: "https://example.com/submission.pdf",
            cloudinaryId: "cloud-1",
            resourceType: "raw",
        });

        const res = await request(app).delete(`/api/submission/${submission._id}`).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Submission unsubmitted successfully");

        const deletedSubmission = await Submission.findById(submission._id);
        expect(deletedSubmission).toBeNull();
    });

    it("POST /api/submission/recheck/:id allows student to request recheck for graded submission", async () => {
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

        const assignment = await Assignment.create({
            course: course._id,
            title: "Assignment 1",
            description: "Build API",
            dueDate: new Date("2099-05-20T10:00:00.000Z"),
            totalMarks: 100,
            createdBy: faculty._id,
        });

        const submission = await Submission.create({
            assignment: assignment._id,
            course: course._id,
            student: student._id,
            submissionURL: "https://example.com/submission.pdf",
            cloudinaryId: "cloud-1",
            resourceType: "raw",
            isGraded: true,
            marks: 70,
            gradedBy: faculty._id,
        });

        const res = await request(app).post(`/api/submission/recheck/${submission._id}`).set(authHeader()).send({
            message: "Please review again",
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.submission.recheckRequested).toBe(true);
    });

    it("PATCH /api/submission/recheck/:id allows faculty to resolve recheck", async () => {
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
            invitationCode: "join123abc45"
        });

        const assignment = await Assignment.create({
            course: course._id,
            title: "Assignment 1",
            description: "Build API",
            dueDate: new Date("2099-05-20T10:00:00.000Z"),
            totalMarks: 100,
            createdBy: faculty._id,
        });

        const submission = await Submission.create({
            assignment: assignment._id,
            course: course._id,
            student: student._id,
            submissionURL: "https://example.com/submission.pdf",
            cloudinaryId: "cloud-1",
            resourceType: "raw",
            isGraded: true,
            marks: 70,
            gradedBy: faculty._id,
            recheckRequested: true,
        });

        const res = await request(app).patch(`/api/submission/recheck/${submission._id}`).set(authHeader()).send({
            marks: 80,
            feedback: "Updated after review",
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.submission.recheckResolved).toBe(true);
        expect(res.body.submission.marks).toBe(80);
    });
});
