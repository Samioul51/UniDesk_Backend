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
const notifyUsersMock = jest.fn();

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

jest.unstable_mockModule(
    "../../../../src/utils/NotificationEngine/notificationService.js",
    () => ({
        notifyUsers: notifyUsersMock,
    })
);

const { default: app } = await import("../../../../src/app.js");
const { User } = await import("../../../../src/models/UserModel/user.model.js");
const { Conversation } = await import(
    "../../../../src/models/ConversationModel/conversation.model.js"
);
const { Message } = await import(
    "../../../../src/models/MessageModel/message.model.js"
);

const authHeader = () => ({
    Authorization: "Bearer valid-token",
});

describe("Conversation Routes Integration", () => {
    beforeAll(async () => {
        await connectTestDB();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        notifyUsersMock.mockResolvedValue();
        await clearTestDB([Message, Conversation, User]);
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    it("POST /api/conversation creates a new conversation", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        const student = await User.create(buildStudent());
        const faculty = await User.create(buildFaculty());

        const res = await request(app).post("/api/conversation").set(authHeader()).send({
            receiverID: faculty._id.toString(),
        });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Conversation created successfully");

        const conversation = await Conversation.findOne({
            participants: { $all: [student._id, faculty._id] },
        });

        expect(conversation).not.toBeNull();
    });

    it("POST /api/conversation returns existing conversation if already created", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        const student = await User.create(buildStudent());
        const faculty = await User.create(buildFaculty());

        const existingConversation = await Conversation.create({
            participants: [student._id, faculty._id],
        });

        const res = await request(app).post("/api/conversation").set(authHeader()).send({
            receiverID: faculty._id.toString(),
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Conversation already exists");
        expect(res.body.conversation._id).toBe(existingConversation._id.toString());
    });

    it("POST /api/messages allows a participant to send a message", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });
        notifyUsersMock.mockResolvedValue();

        const student = await User.create(buildStudent());
        const faculty = await User.create(buildFaculty());

        const conversation = await Conversation.create({
            participants: [student._id, faculty._id],
        });

        const res = await request(app).post("/api/messages").set(authHeader()).send({
            conversationID: conversation._id.toString(),
            content: "Hello sir",
        });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Message sent");
        expect(res.body.data.content).toBe("Hello sir");

        const message = await Message.findOne({ conversation: conversation._id });
        expect(message).not.toBeNull();
        expect(message.content).toBe("Hello sir");
    });

    it("GET /api/conversation/:id blocks a user who is not a participant", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: otherStudentEmail });

        const student = await User.create(buildStudent());
        const faculty = await User.create(buildFaculty());
        await User.create(buildOtherStudent());

        const conversation = await Conversation.create({
            participants: [student._id, faculty._id],
        });

        const res = await request(app).get(`/api/conversation/${conversation._id}`).set(authHeader());

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Unauthorized user");
    });

    it("PATCH /api/messages/read/:conversationID marks unread messages as seen for a participant", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: facultyEmail });

        const student = await User.create(buildStudent());
        const faculty = await User.create(buildFaculty());

        const conversation = await Conversation.create({
            participants: [student._id, faculty._id],
        });

        await Message.create([
            {
                conversation: conversation._id,
                sender: student._id,
                content: "First message",
                read: false,
            },
            {
                conversation: conversation._id,
                sender: student._id,
                content: "Second message",
                read: false,
            },
        ]);

        const res = await request(app).patch(`/api/messages/read/${conversation._id}`).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Messages marked as read");

        const unreadCount = await Message.countDocuments({
            conversation: conversation._id,
            read: false,
        });

        expect(unreadCount).toBe(0);
    });
});
