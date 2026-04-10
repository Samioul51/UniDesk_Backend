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
const { Appointment } = await import(
    "../../../../src/models/AppointmentModel/appointment.model.js"
);

const authHeader = () => ({
    Authorization: "Bearer valid-token",
});

describe("Appointment Routes Integration", () => {
    beforeAll(async () => {
        await connectTestDB();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        await clearTestDB([Appointment, Schedule, User]);
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    it("POST /api/appointment allows a student to book an appointment in a valid free slot", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        const student = await User.create(buildStudent());
        const faculty = await User.create(buildFaculty());

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

        const res = await request(app).post("/api/appointment").set(authHeader()).send({
            facultyID: faculty._id.toString(),
            date: "2099-04-12",
            startTime: "10:00",
            endTime: "10:30",
            purpose: "Project discussion",
            mode: "online",
            meetingType: "general",
        });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Appointment booked successfully");

        const appointment = await Appointment.findOne({
            faculty: faculty._id,
            student: student._id,
        });
        expect(appointment).not.toBeNull();
    });

    it("POST /api/appointment blocks booking outside available free slots", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        const faculty = await User.create(buildFaculty());
        await User.create(buildStudent());

        await Schedule.create({
            faculty: faculty._id,
            weeklySchedule: [
                {
                    day: "Sunday",
                    classes: [],
                    freeSlots: [{ startTime: "11:00", endTime: "12:00" }],
                },
            ],
        });

        const res = await request(app).post("/api/appointment").set(authHeader()).send({
            facultyID: faculty._id.toString(),
            date: "2099-04-12",
            startTime: "10:00",
            endTime: "10:30",
            purpose: "Project discussion",
            mode: "online",
            meetingType: "general",
        });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Time not in available slot");
    });

    it("PATCH /api/appointment/:id allows a student to request cancellation", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        const faculty = await User.create(buildFaculty());
        const student = await User.create(buildStudent());

        const appointment = await Appointment.create({
            faculty: faculty._id,
            student: student._id,
            startTime: new Date("2099-04-12T10:00:00.000Z"),
            endTime: new Date("2099-04-12T10:30:00.000Z"),
            purpose: "Project discussion",
            mode: "online",
            meetingType: "general",
            status: "pending",
        });

        const res = await request(app).patch(`/api/appointment/${appointment._id}`).set(authHeader()).send({
            reason: "Need to reschedule",
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Cancellation request sent to faculty");
        expect(res.body.appointment.cancelRequestedByStudent).toBe(true);
    });

    it("PATCH /api/appointment/:id allows a faculty to approve an online appointment", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: facultyEmail });

        const faculty = await User.create(buildFaculty());
        const student = await User.create(buildStudent());

        const appointment = await Appointment.create({
            faculty: faculty._id,
            student: student._id,
            startTime: new Date("2099-04-12T10:00:00.000Z"),
            endTime: new Date("2099-04-12T10:30:00.000Z"),
            purpose: "Project discussion",
            mode: "online",
            meetingType: "general",
            status: "pending",
        });

        const res = await request(app).patch(`/api/appointment/${appointment._id}`).set(authHeader()).send({
            status: "approved",
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.appointment.status).toBe("approved");
        expect(res.body.appointment.meetLink).toContain("https://meet.jit.si/UniDesk-");
    });

    it("GET /api/appointment/:id blocks users who are not the owner", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: otherStudentEmail });

        const faculty = await User.create(buildFaculty());
        const student = await User.create(buildStudent());
        await User.create(buildOtherStudent());

        const appointment = await Appointment.create({
            faculty: faculty._id,
            student: student._id,
            startTime: new Date("2099-04-12T10:00:00.000Z"),
            endTime: new Date("2099-04-12T10:30:00.000Z"),
            purpose: "Project discussion",
            mode: "online",
            meetingType: "general",
            status: "pending",
        });

        const res = await request(app).get(`/api/appointment/${appointment._id}`).set(authHeader());

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("You are not allowed to view this appointment");
    });
});
