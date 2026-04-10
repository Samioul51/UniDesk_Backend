import { jest } from "@jest/globals";

const supervisorModelMock = {
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    find: jest.fn(),
};

const userModelMock = {
    findById: jest.fn(),
};

const appointmentModelMock = {
    findOne: jest.fn(),
    find: jest.fn(),
};

const notifyUsersMock = jest.fn();
const formatNameMock = jest.fn((name) => name);

jest.unstable_mockModule(
    "../../../../src/models/SupervisorModel/supervisor.model.js",
    () => ({
        Supervisor: supervisorModelMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/models/UserModel/user.model.js",
    () => ({
        User: userModelMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/models/AppointmentModel/appointment.model.js",
    () => ({
        Appointment: appointmentModelMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/utils/NotificationEngine/notificationService.js",
    () => ({
        notifyUsers: notifyUsersMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/utils/FormatName/formatName.js",
    () => ({
        formatName: formatNameMock,
    })
);

const {
    assignSupervisee,
    updateSuperViseeStatus,
    removeSupervisee
} = await import(
    "../../../../src/controllers/SupervisorController/supervisor.controller.js"
);

const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe("SupervisorController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        notifyUsersMock.mockResolvedValue();
    });

    describe("assignSupervisee", () => {

        // Supervisee cant be assigned without providing all necessary fields test

        it("returns 400 when required fields are missing", async () => {
            const req = {
                body: {},
                dbUser: { _id: "faculty-1", role: "faculty" },
            };
            const res = createMockRes();

            await assignSupervisee(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "All fields required",
            });
        });

        // Unauthorized user cant assign supervisee test

        it("returns 403 when requester is not authorized to assign for another faculty", async () => {
            userModelMock.findById.mockResolvedValueOnce({
                _id: "faculty-2",
                role: "faculty",
            });

            const req = {
                body: {
                    supervisorID: "faculty-2",
                    studentID: "student-1",
                    relationshipType: "thesis",
                    topic: "AI",
                    description: "Research work",
                },
                dbUser: { _id: "faculty-1", role: "faculty" },
            };
            const res = createMockRes();

            await assignSupervisee(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "You are not authorized to assign supervisee for this Faculty",
            });
        });

        // Blocking assigning supervisee if relationship already exists test

        it("returns 400 when the supervisee relationship already exists", async () => {
            userModelMock.findById
                .mockResolvedValueOnce({
                    _id: "faculty-1",
                    role: "faculty",
                    name: "Teacher One",
                })
                .mockResolvedValueOnce({
                    _id: "student-1",
                    role: "student",
                    name: "Student One",
                });

            supervisorModelMock.findOne.mockResolvedValue({
                supervises: [
                    {
                        student: { toString: () => "student-1" },
                        relationshipType: "thesis",
                    },
                ],
            });

            const req = {
                body: {
                    supervisorID: "faculty-1",
                    studentID: "student-1",
                    relationshipType: "thesis",
                    topic: "AI",
                    description: "Research work",
                },
                dbUser: { _id: "faculty-1", role: "faculty" },
            };
            const res = createMockRes();

            await assignSupervisee(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Student already assigned to this supervisor for thesis",
            });
        });
    });

    describe("updateSuperViseeStatus", () => {

        // Blocking status change if status is completed test

        it("returns 400 when trying to change completed status back to active", async () => {
            supervisorModelMock.findOne.mockResolvedValue({
                supervises: [
                    {
                        student: { toString: () => "student-1" },
                        relationshipType: "thesis",
                        status: "completed",
                    },
                ],
            });

            const req = {
                params: { supervisorID: "faculty-1" },
                body: {
                    studentID: "student-1",
                    relationshipType: "thesis",
                    status: "active",
                },
                dbUser: { _id: "faculty-1", role: "faculty" },
            };
            const res = createMockRes();

            await updateSuperViseeStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Completed status cannot be changed to active",
            });
        });
    });

    describe("removeSupervisee", () => {

        // Handling invalid relationship search test

        it("returns 404 when the supervisee relationship is not found", async () => {
            supervisorModelMock.findOne.mockResolvedValue({
                supervises: [
                    {
                        student: { toString: () => "student-2" },
                        relationshipType: "project",
                    },
                ],
            });

            const req = {
                params: { supervisorID: "faculty-1" },
                body: {
                    studentID: "student-1",
                    relationshipType: "thesis",
                },
                dbUser: { _id: "faculty-1", role: "faculty" },
            };
            const res = createMockRes();

            await removeSupervisee(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Supervisee relationship not found",
            });
        });
    });
});
