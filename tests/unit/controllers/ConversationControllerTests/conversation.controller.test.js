import { jest } from "@jest/globals";

const conversationModelMock = {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
};

const messageModelMock = {
    create: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
};

const userModelMock = {
    findById: jest.fn(),
    find: jest.fn(),
};

const notifyUsersMock = jest.fn();
const formatNameMock = jest.fn((name) => name);
const emitMock = jest.fn();
const toMock = jest.fn(() => ({ emit: emitMock }));

jest.unstable_mockModule(
    "../../../../src/models/ConversationModel/conversation.model.js",
    () => ({
        Conversation: conversationModelMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/models/MessageModel/message.model.js",
    () => ({
        Message: messageModelMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/models/UserModel/user.model.js",
    () => ({
        User: userModelMock,
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

jest.unstable_mockModule("../../../../src/index.js", () => ({
    io: {
        to: toMock,
    },
}));

const {
    createConversation,
    getConversation,
    sendMessage
} = await import(
    "../../../../src/controllers/ConversationController/conversation.controller.js"
);

const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe("ConversationController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        notifyUsersMock.mockResolvedValue();
    });

    describe("createConversation", () => {

        // Blocks creating conversation if receiver missing test

        it("returns 400 when receiver is missing", async () => {
            const req = {
                dbUser: { _id: "user-1" },
                body: {},
            };
            const res = createMockRes();

            await createConversation(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Receiver required",
            });
        });

        // Blocks creating conversation if sender and receiver are same test

        it("returns 400 when user tries to create a conversation with self", async () => {
            const req = {
                dbUser: { _id: "user-1" },
                body: { receiverID: "user-1" },
            };
            const res = createMockRes();

            await createConversation(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Cannot create conversation with own",
            });
        });

        // Blocks creating new conversation if already exists test

        it("returns 200 when the conversation already exists", async () => {

            const user1 = "507f1f77bcf86cd799439011";
            const user2 = "507f1f77bcf86cd799439012";

            const existingConversation = {
                _id: "507f1f77bcf86cd799439021",
                participants: [user1, user2],
            };

            userModelMock.findById.mockResolvedValue({ _id: user2 });

            conversationModelMock.findOne.mockReturnValue({
                populate: jest.fn().mockResolvedValue(existingConversation),
            });

            const req = {
                dbUser: { _id: user1 },
                body: { receiverID: user2 },
            };
            const res = createMockRes();

            await createConversation(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Conversation already exists",
                conversation: existingConversation,
            });
        });
    });

    describe("getConversation", () => {

        // Blocks access to participants that are unauthorized test

        it("returns 403 when the requester is not a participant", async () => {
            const conversation = {
                _id: "conv-1",
                participants: [
                    { _id: { toString: () => "user-1" } },
                    { _id: { toString: () => "user-2" } },
                ],
            };

            conversationModelMock.findById.mockReturnValue({
                populate: jest.fn(() => ({
                    populate: jest.fn().mockResolvedValue(conversation),
                })),
            });

            const req = {
                params: { id: "conv-1" },
                dbUser: { _id: "user-3" },
            };
            const res = createMockRes();

            await getConversation(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Unauthorized user",
            });
        });
    });

    describe("sendMessage", () => {

        // Message sending test

        it("sends a message successfully for a valid participant", async () => {
            const user1 = "507f1f77bcf86cd799439011";
            const user2 = "507f1f77bcf86cd799439012";
            const conv1 = "507f1f77bcf86cd799439021";

            const conversation = {
                _id: conv1,
                participants: [
                    { toString: () => user1 },
                    { toString: () => user2 }
                ],
            };

            const createdMessage = {
                _id: "507f1f77bcf86cd799439031",
                content: "Hello",
            };

            const populatedMessage = {
                _id: "507f1f77bcf86cd799439031",
                content: "Hello",
                sender: {
                    _id: user1,
                    name: "Sender",
                },
            };

            conversationModelMock.findById.mockResolvedValue(conversation);

            userModelMock.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue({ name: "Sender" }),
            });

            messageModelMock.create.mockResolvedValue(createdMessage);
            messageModelMock.findById.mockReturnValue({
                populate: jest.fn().mockResolvedValue(populatedMessage),
            });
            conversationModelMock.findByIdAndUpdate.mockResolvedValue({});

            const req = {
                dbUser: { _id: user1 },
                body: {
                    conversationID: conv1,
                    content: "Hello"
                },
            };
            const res = createMockRes();

            await sendMessage(req, res);

            expect(messageModelMock.create).toHaveBeenCalledWith({
                conversation: conv1,
                sender: user1,
                content: "Hello",
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Message sent",
                data: populatedMessage,
            });
        });
    });
});
