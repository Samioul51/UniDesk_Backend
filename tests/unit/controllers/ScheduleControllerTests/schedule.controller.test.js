import { jest } from "@jest/globals";

const scheduleModelMock = {
    findOne: jest.fn(),
    create: jest.fn(),
};

const userModelMock = {
    findById: jest.fn(),
};

const validateWeeklyScheduleMock = jest.fn();

jest.unstable_mockModule(
    "../../../../src/models/ScheduleModel/schedule.model.js",
    () => ({
        Schedule: scheduleModelMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/models/UserModel/user.model.js",
    () => ({
        User: userModelMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/utils/HelperFunctionsForScheduleUpdate/helperSchedule.js",
    () => ({
        validateWeeklySchedule: validateWeeklyScheduleMock,
    })
);

const {
    scheduleCreation,
    facultySchedule,
    updateSchedule
} = await import(
    "../../../../src/controllers/ScheduleController/schedule.controller.js"
);

const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe("ScheduleController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("scheduleCreation", () => {

        // Schedule cant be created without providing all necessary fields test

        it("returns 400 when required fields are missing", async () => {
            const req = {
                body: {},
            };
            const res = createMockRes();

            await scheduleCreation(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Faculty ID and weekly schedule are required",
            });
        });

        // Schedule cant be created with duplicate days test

        it("returns 400 when weekly schedule contains duplicate days", async () => {
            userModelMock.findById.mockResolvedValue({
                _id: "faculty-1",
                role: "faculty",
            });

            const req = {
                body: {
                    facultyID: "faculty-1",
                    weeklySchedule: [
                        { day: "Sunday", classes: [], freeSlots: [] },
                        { day: "Sunday", classes: [], freeSlots: [] },
                    ],
                },
            };
            const res = createMockRes();

            await scheduleCreation(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Duplicate days are not allowed",
            });
        });
    });

    describe("facultySchedule", () => {

        // Blocking schedule creation if user is not faculty test

        it("returns 403 when the target user is not a faculty", async () => {
            userModelMock.findById.mockResolvedValue({
                _id: "user-1",
                role: "student",
            });

            const req = {
                params: { id: "user-1" },
            };
            const res = createMockRes();

            await facultySchedule(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "User is not a faculty",
            });
        });
    });

    describe("updateSchedule", () => {

        // Unauthorized user cant update schedule test

        it("returns 403 when the requester is not authorized to update the schedule", async () => {
            const req = {
                dbUser: { _id: "faculty-2", role: "faculty" },
                body: {
                    facultyID: "faculty-1",
                    weeklySchedule: [
                        { day: "Sunday", classes: [], freeSlots: [] },
                    ],
                },
            };
            const res = createMockRes();

            await updateSchedule(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "You are not authorized to update schedule",
            });
        });

        // Schedule update test

        it("updates schedule successfully", async () => {
            validateWeeklyScheduleMock.mockReturnValue(null);

            const saveMock = jest.fn();
            const existingSchedule = {
                toObject: jest.fn().mockReturnValue({
                    weeklySchedule: [
                        { day: "Sunday", classes: [], freeSlots: [] },
                    ],
                }),
                weeklySchedule: [
                    { day: "Monday", classes: [], freeSlots: [] },
                ],
                save: saveMock,
            };

            scheduleModelMock.findOne.mockResolvedValue(existingSchedule);

            const req = {
                dbUser: { _id: "faculty-1", role: "faculty" },
                body: {
                    facultyID: "faculty-1",
                    weeklySchedule: [
                        { day: "Monday", classes: [], freeSlots: [] },
                    ],
                },
            };
            const res = createMockRes();

            await updateSchedule(req, res);

            expect(saveMock).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Schedule updated successfully",
                schedule: existingSchedule,
            });
        });
    });
});
