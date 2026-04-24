import { jest } from "@jest/globals";

const insertManyMock = jest.fn();
const deleteManyMock = jest.fn();
const countDocumentsMock = jest.fn();
const emitMock = jest.fn();
const toMock = jest.fn(() => ({ emit: emitMock }));
const skipMock = jest.fn();
const sortMock = jest.fn(() => ({ skip: skipMock }));
const findMock = jest.fn(() => ({ sort: sortMock }));

const userSelectMock = jest.fn();
const userFindMock = jest.fn(() => ({ select: userSelectMock }));

const sendNotificationEmailMock = jest.fn();

// Notification service mocking

jest.unstable_mockModule("../../../src/models/NotificationModel/notification.model.js", () => ({
    Notification: {
        insertMany: insertManyMock,
        find: findMock,
        deleteMany: deleteManyMock,
        countDocuments: countDocumentsMock,
    },
}));

// User mock for email notification

jest.unstable_mockModule("../../../src/models/UserModel/user.model.js", () => ({
    User: {
        find: userFindMock,
    },
}));

// Email mock

jest.unstable_mockModule("../../../src/utils/Email/sendNotificationEmail.js", () => ({
    sendNotificationEmail: sendNotificationEmailMock,
}));

// IO mocking

jest.unstable_mockModule("../../../src/index.js", () => ({
    io: {
        to: toMock,
    },
}));

const { notifyUsers } = await import("../../../src/utils/NotificationEngine/notificationService.js");

describe("notifyUsers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        skipMock.mockResolvedValue([]);
        countDocumentsMock.mockResolvedValue(2);
        userSelectMock.mockResolvedValue([
            { name: "User One", email: "user1@test.com" },
            { name: "User Two", email: "user2@test.com" },
        ]);
        sendNotificationEmailMock.mockResolvedValue();
    });

    // Notifying users working or not test

    it("creates notifications for all receivers", async () => {
        skipMock.mockResolvedValue([]);
        countDocumentsMock.mockResolvedValue(2);

        const payload = {
            receivers: ["user1", "user2"],
            sender: "admin1",
            type: "NEW_ANNOUNCEMENT",
            title: "New Announcement",
            message: "A new announcement was posted",
            entityID: "123",
            entityModel: "Announcement",
            redirectURL: "/announcements/123",
        };

        await notifyUsers(payload);

        expect(insertManyMock).toHaveBeenCalledTimes(1);
        expect(insertManyMock).toHaveBeenCalledWith([
            {
                receiver: "user1",
                sender: "admin1",
                type: "NEW_ANNOUNCEMENT",
                title: "New Announcement",
                message: "A new announcement was posted",
                entityID: "123",
                entityModel: "Announcement",
                redirectURL: "/announcements/123",
            },
            {
                receiver: "user2",
                sender: "admin1",
                type: "NEW_ANNOUNCEMENT",
                title: "New Announcement",
                message: "A new announcement was posted",
                entityID: "123",
                entityModel: "Announcement",
                redirectURL: "/announcements/123",
            },
        ]);
    });

    // Notifications deletion if older than latest 30

    it("deletes notifications older than the latest 30", async () => {
        skipMock.mockResolvedValue([{ _id: "old1" }, { _id: "old2" }]);
        countDocumentsMock.mockResolvedValue(1);

        await notifyUsers({
            receivers: ["user1"],
            sender: "admin1",
            type: "NEW_ANNOUNCEMENT",
            title: "Title",
            message: "Message",
            entityID: "123",
            entityModel: "Announcement",
            redirectURL: "/announcements/123",
        });

        expect(deleteManyMock).toHaveBeenCalledTimes(1);
        expect(deleteManyMock).toHaveBeenCalledWith({
            _id: { $in: ["old1", "old2"] },
        });
    });

    // IO emiting notification and unread count events for each receiver

    it("emits new notification and unread count events for each receiver", async () => {
        skipMock.mockResolvedValue([]);
        countDocumentsMock.mockResolvedValue(5);

        await notifyUsers({
            receivers: ["user1", "user2"],
            sender: "admin1",
            type: "NEW_ANNOUNCEMENT",
            title: "Title",
            message: "Message",
            entityID: "123",
            entityModel: "Announcement",
            redirectURL: "/announcements/123",
        });

        expect(toMock).toHaveBeenCalledWith("user1");
        expect(toMock).toHaveBeenCalledWith("user2");

        expect(emitMock).toHaveBeenCalledWith("new_notification");
        expect(emitMock).toHaveBeenCalledWith("unread_count", 5);
    });

    it("sends email only for enabled notification types", async () => {
        await notifyUsers({
            receivers: ["user1", "user2"],
            sender: "admin1",
            type: "NEW_ANNOUNCEMENT",
            title: "Title",
            message: "Message",
            entityID: "123",
            entityModel: "Announcement",
            redirectURL: "/announcements/123",
        });

        expect(userFindMock).toHaveBeenCalledWith({
            _id: { $in: ["user1", "user2"] },
        });
        expect(sendNotificationEmailMock).toHaveBeenCalledTimes(2);
    });

    it("does not send email for disabled notification types", async () => {
        await notifyUsers({
            receivers: ["user1", "user2"],
            sender: "admin1",
            type: "NEW_MESSAGE",
            title: "Title",
            message: "Message",
            entityID: "123",
            entityModel: "Conversation",
            redirectURL: "/chat/123",
        });

        expect(userFindMock).not.toHaveBeenCalled();
        expect(sendNotificationEmailMock).not.toHaveBeenCalled();
    });

});