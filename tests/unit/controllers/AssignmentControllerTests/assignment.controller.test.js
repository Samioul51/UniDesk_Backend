import { jest } from "@jest/globals";

const assignmentModelMock = {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
};

const courseModelMock = {
    findById: jest.fn(),
};

const submissionModelMock = {
    findOne: jest.fn(),
    create: jest.fn(),
};

const validateAttachmentsMock = jest.fn();
const deleteFromCloudinaryMock = jest.fn();
const notifyUsersMock = jest.fn();

jest.unstable_mockModule(
    "../../../../src/models/AssignmentModel/assignment.model.js",
    () => ({
        Assignment: assignmentModelMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/models/CourseModel/course.model.js",
    () => ({
        Course: courseModelMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/models/AssignmentSubmissionModel/submission.model.js",
    () => ({
        Submission: submissionModelMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/utils/CloudinaryValidation/cloudinaryValidation.js",
    () => ({
        validateAttachments: validateAttachmentsMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/utils/DeleteFromCloudinary/deleteFromCloudinary.js",
    () => ({
        deleteFromCloudinary: deleteFromCloudinaryMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/utils/NotificationEngine/notificationService.js",
    () => ({
        notifyUsers: notifyUsersMock,
    })
);

const {
    uploadAssignment,
    getAssignment,
    updateAssignment,
    submitAssignment,
    gradeSubmission,
    unsubmitAssignment,
    requestRecheckSubmission,
    resolveRecheckSubmission,
} = await import(
    "../../../../src/controllers/AssignmentController/assignment.controller.js"
);

const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe("AssignmentController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("uploadAssignment", () => {

        // Missing fields block assignment upload test

        it("returns 400 when required fields are missing", async () => {
            courseModelMock.findById.mockResolvedValue({
                faculties: ["faculty-1"],
                students: [],
            });

            const req = {
                params: { id: "course-1" },
                dbUser: { _id: "faculty-1" },
                body: {},
            };
            const res = createMockRes();

            await uploadAssignment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Title, Description, DueDate, Total marks required",
            });
        });

        // Invalid attachments block assignment upload test

        it("returns 400 when attachments are invalid", async () => {
            courseModelMock.findById.mockResolvedValue({
                faculties: ["faculty-1"],
                students: [],
            });
            validateAttachmentsMock.mockReturnValue(false);

            const req = {
                params: { id: "course-1" },
                dbUser: { _id: "faculty-1" },
                body: {
                    title: "Assignment 1",
                    description: "Solve all questions",
                    dueDate: "2099-05-01",
                    totalMarks: 100,
                    attachments: [{ url: "x" }],
                },
            };
            const res = createMockRes();

            await uploadAssignment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Each attachment needs url, cloudinaryId and valid resourceType",
            });
        });

        // Assignment creation test

        it("creates assignment successfully", async () => {
            const createdAssignment = { _id: "assignment-1", title: "Assignment 1" };

            courseModelMock.findById.mockResolvedValue({
                _id: "course-1",
                faculties: ["faculty-1"],
                students: ["student-1"],
            });
            assignmentModelMock.create.mockResolvedValue(createdAssignment);

            const req = {
                params: { id: "course-1" },
                dbUser: { _id: "faculty-1" },
                body: {
                    title: "Assignment 1",
                    description: "Solve all questions",
                    dueDate: "2099-05-01",
                    totalMarks: 100,
                },
            };
            const res = createMockRes();

            await uploadAssignment(req, res);

            expect(assignmentModelMock.create).toHaveBeenCalledWith({
                course: "course-1",
                title: "Assignment 1",
                description: "Solve all questions",
                dueDate: "2099-05-01",
                totalMarks: 100,
                createdBy: "faculty-1",
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Assignment uploaded successfully",
                assignment: createdAssignment,
            });
        });
    });

    describe("getAssignment", () => {

        // Block unauthorized user to get assignment test

        it("returns 403 when user is not enrolled in the course", async () => {
            courseModelMock.findById.mockResolvedValue({
                faculties: ["faculty-2"],
                students: ["student-2"],
            });

            const req = {
                params: { courseID: "course-1", assignmentID: "assignment-1" },
                dbUser: { _id: "student-1" },
            };
            const res = createMockRes();

            await getAssignment(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "You are not authorized to get this course assignments",
            });
        });
    });

    describe("updateAssignment", () => {

        // Block assignment update if nothing is provided to update test

        it("returns 400 when nothing is provided to update", async () => {
            assignmentModelMock.findById.mockResolvedValue({
                _id: "assignment-1",
                course: "course-1",
                title: "Old title",
                description: "Old desc",
                dueDate: new Date("2099-05-01T10:00:00"),
                totalMarks: 100,
                attachments: [],
            });

            courseModelMock.findById.mockResolvedValue({
                faculties: ["faculty-1"],
                students: [],
            });

            const req = {
                params: { id: "assignment-1" },
                dbUser: { _id: "faculty-1" },
                body: {},
            };
            const res = createMockRes();

            await updateAssignment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Nothing to update",
            });
        });

        // Block assignment update if total marks is invalid test

        it("returns 400 when totalMarks is invalid", async () => {
            assignmentModelMock.findById.mockResolvedValue({
                _id: "assignment-1",
                course: "course-1",
                title: "Old title",
                description: "Old desc",
                dueDate: new Date("2099-05-01T10:00:00"),
                totalMarks: 100,
                attachments: [],
            });

            courseModelMock.findById.mockResolvedValue({
                faculties: ["faculty-1"],
                students: [],
            });

            const req = {
                params: { id: "assignment-1" },
                dbUser: { _id: "faculty-1" },
                body: { totalMarks: 0 },
            };
            const res = createMockRes();

            await updateAssignment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "totalMarks must be greater than 0",
            });
        });

        // Assignment update test

        it("updates assignment successfully", async () => {
            const updatedAssignment = { _id: "assignment-1", title: "New title" };

            assignmentModelMock.findById
                .mockResolvedValueOnce({
                    _id: "assignment-1",
                    course: "course-1",
                    title: "Old title",
                    description: "Old desc",
                    dueDate: new Date("2099-05-01T10:00:00"),
                    totalMarks: 100,
                    attachments: [],
                })
                .mockResolvedValueOnce(updatedAssignment);

            courseModelMock.findById.mockResolvedValue({
                _id: "course-1",
                faculties: ["faculty-1"],
                students: [],
            });

            const req = {
                params: { id: "assignment-1" },
                dbUser: { _id: "faculty-1" },
                body: { title: "New title" },
            };
            const res = createMockRes();

            await updateAssignment(req, res);

            expect(assignmentModelMock.updateOne).toHaveBeenCalledWith(
                { _id: "assignment-1" },
                {
                    $set: {
                        title: "New title",
                    },
                }
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Assignment updated successfully",
                assignment: updatedAssignment,
            });
        });
    });

    describe("submitAssignment", () => {

        // Block assignment submission if deadline passed test

        it("returns 403 when assignment deadline has passed", async () => {
            assignmentModelMock.findById.mockResolvedValue({
                _id: "assignment-1",
                course: "course-1",
                dueDate: new Date("2000-01-01T10:00:00"),
                title: "Assignment 1",
            });

            courseModelMock.findById.mockResolvedValue({
                faculties: ["faculty-1"],
                students: ["student-1"],
                _id: "course-1",
            });

            const req = {
                params: { id: "assignment-1" },
                dbUser: { _id: "student-1", studentID: "2107001" },
                body: {
                    submissionURL: "https://file.com/submission.pdf",
                    cloudinaryId: "cloud-1",
                    resourceType: "raw",
                },
            };
            const res = createMockRes();

            await submitAssignment(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Submission deadline has passed",
            });
        });

        // Block assignment submission if already submitted test

        it("returns 409 when student has already submitted", async () => {
            assignmentModelMock.findById.mockResolvedValue({
                _id: "assignment-1",
                course: "course-1",
                dueDate: new Date("2099-05-01T10:00:00"),
                title: "Assignment 1",
            });

            courseModelMock.findById.mockResolvedValue({
                faculties: ["faculty-1"],
                students: ["student-1"],
                _id: "course-1",
            });

            submissionModelMock.findOne.mockResolvedValue({
                _id: "submission-1",
                assignment: "assignment-1",
            });

            const req = {
                params: { id: "assignment-1" },
                dbUser: { _id: "student-1", studentID: "2107001" },
                body: {
                    submissionURL: "https://file.com/submission.pdf",
                    cloudinaryId: "cloud-1",
                    resourceType: "raw",
                },
            };
            const res = createMockRes();

            await submitAssignment(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "You have already submitted this assignment",
            });
        });

        // Assignment submission test

        it("submits assignment successfully", async () => {
            const createdSubmission = { _id: "submission-1" };

            assignmentModelMock.findById.mockResolvedValue({
                _id: "assignment-1",
                course: "course-1",
                dueDate: new Date("2099-05-01T10:00:00"),
                title: "Assignment 1",
            });

            courseModelMock.findById.mockResolvedValue({
                faculties: ["faculty-1"],
                students: ["student-1"],
                _id: "course-1",
            });

            submissionModelMock.findOne.mockResolvedValue(null);
            submissionModelMock.create.mockResolvedValue(createdSubmission);

            const req = {
                params: { id: "assignment-1" },
                dbUser: { _id: "student-1", studentID: "2107001" },
                body: {
                    submissionURL: "https://file.com/submission.pdf",
                    cloudinaryId: "cloud-1",
                    resourceType: "raw",
                },
            };
            const res = createMockRes();

            await submitAssignment(req, res);

            expect(submissionModelMock.create).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Assignment submitted successfully",
                submission: createdSubmission,
            });
        });
    });

    describe("gradeSubmission", () => {

        // Blocks grade submission if marks exceeds total marks test

        it("returns 400 when marks exceed total marks", async () => {
            assignmentModelMock.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    _id: "assignment-1",
                    course: "course-1",
                    totalMarks: 100,
                    title: "Assignment 1",
                }),
            });

            courseModelMock.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    _id: "course-1",
                    faculties: ["faculty-1"],
                }),
            });

            submissionModelMock.findOne.mockResolvedValue({
                _id: "submission-1",
                assignment: "assignment-1"
            });

            const req = {
                params: { id: "assignment-1", submissionId: "submission-1" },
                dbUser: { _id: "faculty-1" },
                body: { marks: 120 },
            };
            const res = createMockRes();

            await gradeSubmission(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Marks exceed total marks",
            });
        });

        // Blocks grade submission if marks are negative

        it("returns 400 when marks are negative", async () => {
            assignmentModelMock.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    _id: "assignment-1",
                    course: "course-1",
                    totalMarks: 100,
                    title: "Assignment 1"
                }),
            });

            courseModelMock.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    _id: "course-1",
                    faculties: ["faculty-1"]
                }),
            });

            submissionModelMock.findOne.mockResolvedValue({
                _id: "submission-1",
                assignment: "assignment-1"
            });

            const req = {
                params: { id: "assignment-1", submissionId: "submission-1" },
                dbUser: { _id: "faculty-1" },
                body: { marks: -5 },
            };
            const res = createMockRes();

            await gradeSubmission(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Negative marks cannot be provided",
            });
        });

        // Submission grading test

        it("grades submission successfully", async () => {
            const saveMock = jest.fn();
            const submissionDoc = {
                _id: "submission-1",
                assignment: "assignment-1",
                student: "student-1",
                save: saveMock
            };

            assignmentModelMock.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    _id: "assignment-1",
                    course: "course-1",
                    totalMarks: 100,
                    title: "Assignment 1"
                }),
            });

            courseModelMock.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    _id: "course-1",
                    faculties: ["faculty-1"]
                }),
            });

            submissionModelMock.findOne.mockResolvedValue(submissionDoc);

            const req = {
                params: { id: "assignment-1", submissionId: "submission-1" },
                dbUser: { _id: "faculty-1" },
                body: { marks: 80, feedback: "Good work" },
            };
            const res = createMockRes();

            await gradeSubmission(req, res);

            expect(submissionDoc.marks).toBe(80);
            expect(submissionDoc.feedback).toBe("Good work");
            expect(submissionDoc.isGraded).toBe(true);
            expect(submissionDoc.gradedBy).toBe("faculty-1");
            expect(saveMock).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe("unsubmitAssignment", () => {

        // Block unsubmitting graded submission

        it("returns 403 when graded submission is being unsubmitted", async () => {
            submissionModelMock.findById = jest.fn().mockResolvedValue({
                _id: "submission-1",
                student: { toString: () => "student-1" },
                assignment: "assignment-1",
                marks: 75,
            });

            assignmentModelMock.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue({
                    dueDate: new Date("2099-05-01T10:00:00"),
                    course: "course-1",
                }),
            });

            courseModelMock.findById.mockResolvedValue({
                students: ["student-1"],
            });

            const { unsubmitAssignment: freshUnsubmitAssignment } = await import(
                "../../../../src/controllers/AssignmentController/assignment.controller.js"
            );

            const req = {
                params: { id: "submission-1" },
                dbUser: { _id: "student-1" },
            };
            const res = createMockRes();

            await freshUnsubmitAssignment(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Graded submissions cannot be unsubmitted",
            });
        });
    });

    describe("requestRecheckSubmission", () => {

        // Block repetitive recheck request test

        it("returns 400 when recheck is already requested", async () => {
            submissionModelMock.findOne.mockResolvedValue({
                recheckRequested: true,
                isGraded: true,
            });

            const req = {
                params: { id: "submission-1" },
                dbUser: { _id: "student-1" },
                body: { message: "Please check again" },
            };
            const res = createMockRes();

            await requestRecheckSubmission(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Recheck already requested",
            });
        });
    });

    describe("resolveRecheckSubmission", () => {

        // Block resolve recheck if no recheck requested check test

        it("returns 400 when no recheck was requested", async () => {
            submissionModelMock.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue({
                    assignment: {
                        _id: "assignment-1",
                        course: "course-1",
                        totalMarks: 100,
                    },
                    recheckRequested: false,
                    recheckResolved: false,
                }),
            });

            courseModelMock.findById.mockResolvedValue({
                faculties: ["faculty-1"],
            });

            const { resolveRecheckSubmission: freshResolveRecheckSubmission } =
                await import(
                    "../../../../src/controllers/AssignmentController/assignment.controller.js"
                );

            const req = {
                params: { id: "submission-1" },
                dbUser: { _id: "faculty-1" },
                body: { marks: 90 },
            };
            const res = createMockRes();

            await freshResolveRecheckSubmission(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "No recheck requested",
            });
        });

        // Recheck request resolve test

        it("resolves recheck successfully", async () => {
            const saveMock = jest.fn();
            submissionModelMock.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue({
                    student: "student-1",
                    course: "course-1",
                    assignment: {
                        _id: "assignment-1",
                        course: "course-1",
                        totalMarks: 100,
                    },
                    recheckRequested: true,
                    recheckResolved: false,
                    save: saveMock,
                }),
            });

            courseModelMock.findById.mockResolvedValue({
                faculties: ["faculty-1"],
            });

            const { resolveRecheckSubmission: freshResolveRecheckSubmission } =
                await import(
                    "../../../../src/controllers/AssignmentController/assignment.controller.js"
                );

            const req = {
                params: { id: "submission-1" },
                dbUser: { _id: "faculty-1" },
                body: { marks: 85, feedback: "Updated after review" },
            };
            const res = createMockRes();

            await freshResolveRecheckSubmission(req, res);

            expect(saveMock).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
