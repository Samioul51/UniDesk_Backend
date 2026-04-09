import { jest } from "@jest/globals";

const notificationModelMock = {
    find: jest.fn(),
};

jest.unstable_mockModule(
    "../../../../src/models/NotificationModel/notification.model.js",
    () => ({
        Notification: notificationModelMock,
    })
);

const { getNotifications } = await import(
    "../../../../src/controllers/NotificationController/notification.controller.js"
);

const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe("NotificationController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getNotifications", () => {

        // Get notification test

        it("returns the latest notifications for the current user", async () => {
            const notifications = [
                { _id: "n1", title: "New Assignment" },
                { _id: "n2", title: "New Announcement" },
            ];

            const limitMock = jest.fn().mockResolvedValue(notifications);
            const sortMock = jest.fn(() => ({ limit: limitMock }));

            notificationModelMock.find.mockReturnValue({
                sort: sortMock,
            });

            const req = {
                dbUser: { _id: "user-1" },
            };
            const res = createMockRes();

            await getNotifications(req, res);

            expect(notificationModelMock.find).toHaveBeenCalledWith({
                receiver: "user-1",
            });
            expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
            expect(limitMock).toHaveBeenCalledWith(30);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                notifications,
            });
        });
    });
});
