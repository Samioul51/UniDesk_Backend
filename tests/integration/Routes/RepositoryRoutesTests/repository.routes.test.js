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
const deleteFromCloudinaryMock = jest.fn();
const emitMock = jest.fn();
const toMock = jest.fn(() => ({ emit: emitMock }));
const notifyUsersMock = jest.fn();

jest.unstable_mockModule("../../../../src/utils/Firebase/firebase.js", () => ({
    auth: {
        verifyIdToken: verifyIdTokenMock,
    },
}));

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

jest.unstable_mockModule("../../../../src/index.js", () => ({
    io: {
        to: toMock,
        emit: emitMock,
    },
}));

const { default: app } = await import("../../../../src/app.js");
const { User } = await import("../../../../src/models/UserModel/user.model.js");
const { Repository } = await import(
    "../../../../src/models/RepositoryModel/repository.model.js"
);
const { Leaderboard } = await import(
    "../../../../src/models/ContributionLeaderboardModel/leaderboard.model.js"
);

const authHeader = () => ({
    Authorization: "Bearer valid-token",
});

describe("Repository Routes Integration", () => {
    beforeAll(async () => {
        await connectTestDB();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        notifyUsersMock.mockResolvedValue();
        deleteFromCloudinaryMock.mockResolvedValue({ result: "ok" });
        await clearTestDB([Leaderboard, Repository, User]);
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    it("POST /api/repository uploads a repository item", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        const student = await User.create(buildStudent());
        await User.create(buildAdmin());

        const res = await request(app).post("/api/repository").set(authHeader()).send({
            title: "DSA Notes",
            courseCode: "CSE 2205",
            courseName: "Data Structures and Algorithms",
            year: "2nd",
            semester: "1st",
            itemType: "notes",
            url: "https://example.com/file.pdf",
            description: "Helpful note",
            cloudinaryId: "cloud-1",
            resourceType: "raw",
            tags: ["graph", "tree"],
        });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.item.title).toBe("DSA Notes");

        const item = await Repository.findOne({ uploader: student._id });
        expect(item).not.toBeNull();
    });

    it("GET /api/repository returns approved items for public access", async () => {
        const student = await User.create(buildStudent());

        await Repository.create({
            title: "DSA Notes",
            courseCode: "CSE 2205",
            courseName: "Data Structures and Algorithms",
            year: "2nd",
            semester: "1st",
            itemType: "notes",
            url: "https://example.com/file.pdf",
            description: "Helpful note",
            cloudinaryId: "cloud-1",
            resourceType: "raw",
            tags: ["graph"],
            uploader: student._id,
            status: "approved",
        });

        const res = await request(app).get("/api/repository");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.items).toHaveLength(1);
    });

    it("GET /api/repository/leaderboard returns leaderboard data", async () => {
        const student = await User.create(buildStudent());

        await Leaderboard.create({
            user: student._id,
            totalPoints: 20,
            itemsApproved: 2,
        });

        const res = await request(app).get("/api/repository/leaderboard");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.top10).toHaveLength(1);
        expect(res.body.top10[0].rank).toBe(1);
    });

    it("GET /api/repository/:id returns a single approved item", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        const student = await User.create(buildStudent());

        const item = await Repository.create({
            title: "DSA Notes",
            courseCode: "CSE 2205",
            courseName: "Data Structures and Algorithms",
            year: "2nd",
            semester: "1st",
            itemType: "notes",
            url: "https://example.com/file.pdf",
            description: "Helpful note",
            cloudinaryId: "cloud-1",
            resourceType: "raw",
            tags: ["graph"],
            uploader: student._id,
            status: "approved",
        });

        const res = await request(app).get(`/api/repository/${item._id}`).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.item.title).toBe("DSA Notes");
    });

    it("PATCH /api/repository/:id allows admin to approve a pending item", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: adminEmail });

        const admin = await User.create(buildAdmin());
        const student = await User.create(buildStudent());

        const item = await Repository.create({
            title: "DSA Notes",
            courseCode: "CSE 2205",
            courseName: "Data Structures and Algorithms",
            year: "2nd",
            semester: "1st",
            itemType: "notes",
            url: "https://example.com/file.pdf",
            description: "Helpful note",
            cloudinaryId: "cloud-1",
            resourceType: "raw",
            tags: ["graph"],
            uploader: student._id,
            status: "pending",
        });

        const res = await request(app).patch(`/api/repository/${item._id}`).set(authHeader()).send({
            status: "approved",
        });

        expect(admin.email).toBe(adminEmail);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.item.status).toBe("approved");

        const leaderboard = await Leaderboard.findOne({ user: student._id });
        expect(leaderboard.totalPoints).toBe(10);
    });

    it("DELETE /api/repository/:id allows uploader to delete own item", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: facultyEmail });

        deleteFromCloudinaryMock.mockResolvedValue({ result: "ok" });

        const faculty = await User.create(buildFaculty());

        const item = await Repository.create({
            title: "DSA Notes",
            courseCode: "CSE 2205",
            courseName: "Data Structures and Algorithms",
            year: "2nd",
            semester: "1st",
            itemType: "notes",
            url: "https://example.com/file.pdf",
            description: "Helpful note",
            cloudinaryId: "cloud-1",
            resourceType: "raw",
            tags: ["graph"],
            uploader: faculty._id,
            status: "approved",
        });

        const res = await request(app).delete(`/api/repository/${item._id}`).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Item permanently deleted");

        const deletedItem = await Repository.findById(item._id);
        expect(deletedItem).toBeNull();
    });
});
