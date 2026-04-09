import { jest } from "@jest/globals";

const courseModelMock = {
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn()
};

const generateInvitationCodeMock = jest.fn();

jest.unstable_mockModule(
    "../../../../src/models/CourseModel/course.model.js",
    () => ({
        Course: courseModelMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/utils/InvitationCode/generateInvitationCode.js",
    () => ({
        generateInvitationCode: generateInvitationCodeMock,
    })
);

const {
    createCourse,
    studentJoinCourseByInvitation,
    studentLeaveCourse,
    facultyJoinCourseByInvitation,
    facultyLeaveCourse,
    removeStudentFromCourse,
    getMyCourses,
    updateCourse
} = await import(
    "../../../../src/controllers/CourseController/course.controller.js"
);

const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe("CourseController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("createCourse", () => {

        // Faculty course creation authorization test

        it("returns 403 when requester is not a faculty", async () => {
            const req = {
                body: {},
                dbUser: { _id: "faculty-1", role: "student" },
            };
            const res = createMockRes();

            await createCourse(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Only faculty can create courses",
            });
        });

        // Course cant be created if all neccessary info not provided test

        it("returns 400 when required fields are missing", async () => {
            const req = {
                body: {
                    courseCode: "cse-3200",
                },
                dbUser: { _id: "faculty-1", role: "faculty" },
            };
            const res = createMockRes();

            await createCourse(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "All required fields must be provided",
            });
        });

        // Course creation test

        it("creates a course successfully", async () => {
            generateInvitationCodeMock.mockReturnValue("abc123def456");
            courseModelMock.findOne.mockResolvedValue(null);
            courseModelMock.create.mockResolvedValue({
                _id: "course-1",
                courseCode: "CSE-3200",
            });

            const req = {
                body: {
                    courseCode: " cse-3200 ",
                    courseName: " System Design ",
                    description: "Course description",
                    session: " 2021-22 ",
                    year: " 3rd ",
                    semester: " 2nd ",
                    department: " CSE ",
                },
                dbUser: { _id: "faculty-1", role: "faculty" },
            };
            const res = createMockRes();

            await createCourse(req, res);

            expect(courseModelMock.create).toHaveBeenCalledWith({
                courseCode: "CSE-3200",
                courseName: "System Design",
                description: "Course description",
                session: "2021-22",
                year: "3rd",
                semester: "2nd",
                department: "cse",
                faculties: ["faculty-1"],
                invitationCode: "abc123def456",
                classLink: expect.stringMatching(/^https:\/\/meet\.jit\.si\/UniDesk-/),
            });

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe("studentJoinCourseByInvitation", () => {

        // Student cant join course if invitation code invalid test 

        it("returns 400 when invitation code is invalid", async () => {
            const req = {
                query: {},
                dbUser: { _id: "student-1", role: "student" },
            };
            const res = createMockRes();

            await studentJoinCourseByInvitation(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Invitation code is required",
            });
        });

        // Student cant join already enrolled course test

        it("returns 409 when the student is already enrolled", async () => {
            courseModelMock.findOne.mockResolvedValue({
                _id: "course-1",
                status: "active",
                students: [{ toString: () => "student-1" }],
            });

            const req = {
                query: { invitationCode: "abc123" },
                dbUser: { _id: "student-1", role: "student" },
            };
            const res = createMockRes();

            await studentJoinCourseByInvitation(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Already enrolled in this course",
            });
        });
    });

    describe("studentLeaveCourse", () => {

        // Student cant leave from course if he is not enrolled in the course test

        it("returns 400 when the student is not enrolled in the course", async () => {
            courseModelMock.findById.mockResolvedValue({
                students: [{ toString: () => "student-2" }],
            });

            const req = {
                params: { id: "course-1" },
                dbUser: { _id: "student-1", role: "student" },
            };
            const res = createMockRes();

            await studentLeaveCourse(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "You are not enrolled in this course",
            });
        });
    });

    describe("facultyJoinCourseByInvitation", () => {

        // Cant join more than two faculties in a course test

        it("returns 403 when two faculties are already assigned", async () => {
            courseModelMock.findOne.mockResolvedValue({
                _id: "course-1",
                status: "active",
                faculties: [
                    { toString: () => "faculty-2" },
                    { toString: () => "faculty-3" },
                ],
            });

            const req = {
                query: { code: "abc123" },
                dbUser: { _id: "faculty-1", role: "faculty" },
            };
            const res = createMockRes();

            await facultyJoinCourseByInvitation(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Already two faculties instructing the course",
            });
        });
    });

    describe("facultyLeaveCourse", () => {

        // Faculty cnt make a course orphan test

        it("returns 403 when the faculty is the only instructor", async () => {
            courseModelMock.findById.mockResolvedValue({
                status: "active",
                faculties: [{ toString: () => "faculty-1" }],
            });

            const req = {
                params: { id: "course-1" },
                dbUser: { _id: "faculty-1", role: "faculty" },
            };
            const res = createMockRes();

            await facultyLeaveCourse(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Cannot leave course as the only faculty",
            });
        });
    });

    describe("removeStudentFromCourse", () => {

        // Unauthorized faculty cant remove a student of a course test

        it("returns 403 when requester is not a faculty of the course", async () => {
            courseModelMock.findById.mockResolvedValue({
                status: "active",
                faculties: [{ toString: () => "faculty-2" }],
                students: [{ toString: () => "student-1" }],
            });

            const req = {
                params: { courseId: "course-1", studentId: "student-1" },
                dbUser: { _id: "faculty-1", role: "faculty" },
            };
            const res = createMockRes();

            await removeStudentFromCourse(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "You are not a faculty of this course",
            });
        });
    });

    describe("getMyCourses", () => {

        // Unauthorized access blocked in a course test

        it("returns 403 for an invalid role", async () => {
            const req = {
                query: {},
                dbUser: { _id: "user-1", role: "admin" },
            };
            const res = createMockRes();

            await getMyCourses(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Invalid role",
            });
        });
    });

    describe("updateCourse", () => {

        // Blocked update if there is nothing to update

        it("returns 400 when nothing is provided to update", async () => {
            courseModelMock.findById.mockResolvedValue({
                _id: "course-1",
                status: "active",
                faculties: [{ toString: () => "faculty-1" }],
            });

            const req = {
                params: { id: "course-1" },
                body: {},
                dbUser: { _id: "faculty-1", role: "faculty" },
            };
            const res = createMockRes();

            await updateCourse(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Nothing to update",
            });
        });

        // Course update test

        it("updates the course successfully with a new description", async () => {
            const existingCourse = {
                _id: "course-1",
                status: "active",
                faculties: [{ toString: () => "faculty-1" }],
            };

            const updatedCourse = {
                _id: "course-1",
                description: "Updated description",
            };

            courseModelMock.findById
                .mockResolvedValueOnce(existingCourse)
                .mockResolvedValueOnce(updatedCourse);

            courseModelMock.updateOne.mockResolvedValue({ matchedCount: 1 });

            const req = {
                params: { id: "course-1" },
                body: { description: "Updated description" },
                dbUser: { _id: "faculty-1", role: "faculty" },
            };
            const res = createMockRes();

            await updateCourse(req, res);

            expect(courseModelMock.updateOne).toHaveBeenCalledWith(
                { _id: "course-1" },
                { $set: { description: "Updated description" } }
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Course updated successfully",
                course: updatedCourse,
            });
        });
    });
});
