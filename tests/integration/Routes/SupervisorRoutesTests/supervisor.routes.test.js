import { jest } from "@jest/globals";
import request from "supertest";
import {
    clearTestDB,
    connectTestDB,
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
const emitMock = jest.fn();
const toMock = jest.fn(() => ({ emit: emitMock }));

jest.unstable_mockModule("../../../../src/utils/Firebase/firebase.js", () => ({
    auth: {
        verifyIdToken: verifyIdTokenMock,
    },
}));

jest.unstable_mockModule("../../../../src/index.js", () => ({
    io: {
        to: toMock,
        emit: emitMock,
    },
}));

const { default: app } = await import("../../../../src/app.js");
const { User } = await import("../../../../src/models/UserModel/user.model.js");
const { Schedule } = await import(
    "../../../../src/models/ScheduleModel/schedule.model.js"
);

const authHeader = () => ({
    Authorization: "Bearer valid-token",
});

describe("Schedule Routes Integration", () => {
    beforeAll(async () => {
        await connectTestDB();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        await clearTestDB([Schedule, User]);
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    it("POST /api/schedule allows admin to create a faculty schedule", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: adminEmail });

        const admin = await User.create(buildAdmin());
        const faculty = await User.create(buildFaculty());

        const res = await request(app).post("/api/schedule").set(authHeader()).send({
            facultyID: faculty._id.toString(),
            weeklySchedule: [
                {
                    day: "Sunday",
                    classes: [],
                    freeSlots: [{ startTime: "10:00", endTime: "12:00" }],
                },
            ],
        });

        expect(admin.email).toBe(adminEmail);
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Schedule created successfully");
    });

    it("PATCH /api/schedule allows the faculty to update own schedule", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: facultyEmail });

        const faculty = await User.create(buildFaculty());

        await Schedule.create({
            faculty: faculty._id,
            weeklySchedule: [
                {
                    day: "Sunday",
                    classes: [],
                    freeSlots: [{ startTime: "10:00", endTime: "11:00" }],
                },
            ],
        });

        const res = await request(app).patch("/api/schedule").set(authHeader()).send({
            facultyID: faculty._id.toString(),
            weeklySchedule: [
                {
                    day: "Sunday",
                    classes: [],
                    freeSlots: [{ startTime: "10:00", endTime: "12:00" }],
                },
            ],
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Schedule updated successfully");
    });

    it("GET /api/schedule/:id allows a student to view a faculty schedule", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        const faculty = await User.create(buildFaculty());
        await User.create(buildStudent());

        await Schedule.create({
            faculty: faculty._id,
            weeklySchedule: [
                {
                    day: "Sunday",
                    classes: [],
                    freeSlots: [{ startTime: "10:00", endTime: "12:00" }],
                },
            ],
        });

        const res = await request(app).get(`/api/schedule/${faculty._id}`).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.schedule.faculty).toBe(faculty._id.toString());
    });
});
