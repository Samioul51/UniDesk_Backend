import { jest } from "@jest/globals";
import request from "supertest";
import {
    clearTestDB,
    connectTestDB,
    disconnectTestDB
} from "../../setup/setupTestDB.js";
import {
    buildStudent,
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
const { Notification } = await import(
    "../../../../src/models/NotificationModel/notification.model.js"
);

const authHeader = () => ({
    Authorization: "Bearer valid-token",
});

describe("Notification Routes Integration", () => {
    beforeAll(async () => {
        await connectTestDB();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        await clearTestDB([Notification, User]);
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    it("PATCH /api/notifications/all marks all unread notifications as read for the current user", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        const student = await User.create(buildStudent());
        const otherStudent = await User.create(
            buildStudent({
                email: "other2107001@stud.kuet.ac.bd",
                studentID: "2107001",
                photoId: "photo-3",
            })
        );

        await Notification.create([
            {
                receiver: student._id,
                type: "NEW_ANNOUNCEMENT",
                title: "Announcement 1",
                message: "Message 1",
                isRead: false,
            },
            {
                receiver: student._id,
                type: "NEW_ASSIGNMENT",
                title: "Assignment 1",
                message: "Message 2",
                isRead: false,
            },
            {
                receiver: otherStudent._id,
                type: "NEW_MESSAGE",
                title: "Private Message",
                message: "Message 3",
                isRead: false,
            },
        ]);

        const res = await request(app).patch("/api/notifications/all").set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("All notifications marked as read");

        const currentUserUnread = await Notification.countDocuments({
            receiver: student._id,
            isRead: false,
        });

        const otherUserUnread = await Notification.countDocuments({
            receiver: otherStudent._id,
            isRead: false,
        });

        expect(currentUserUnread).toBe(0);
        expect(otherUserUnread).toBe(1);
    });
});
