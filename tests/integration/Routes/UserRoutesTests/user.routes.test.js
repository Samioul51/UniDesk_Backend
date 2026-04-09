import { jest } from "@jest/globals";
import request from "supertest";
import {
    adminEmail,
    buildAdmin,
    buildFaculty,
    buildOtherStudent,
    buildStudent,
    facultyEmail,
    otherStudentEmail,
    studentEmail
} from "../../helpers/userSeed.js";
import {
    clearTestDB,
    connectTestDB,
    disconnectTestDB
} from "../../setup/setupTestDB.js";

const verifyIdTokenMock = jest.fn();
const getUserByEmailMock = jest.fn();
const deleteUserMock = jest.fn();

const deleteFromCloudinaryMock = jest.fn();
const emitMock = jest.fn();
const toMock = jest.fn(() => ({ emit: emitMock }));

jest.unstable_mockModule("../../../../src/utils/Firebase/firebase.js", () => ({
    auth: {
        verifyIdToken: verifyIdTokenMock,
        getUserByEmail: getUserByEmailMock,
        deleteUser: deleteUserMock,
    },
}));

jest.unstable_mockModule(
    "../../../../src/utils/DeleteFromCloudinary/deleteFromCloudinary.js",
    () => ({
        deleteFromCloudinary: deleteFromCloudinaryMock,
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

const authHeader = (token = "valid-token") => ({
    Authorization: `Bearer ${token}`,
});

describe("User Routes Integration", () => {
    beforeAll(async () => {
        process.env.TZ = "Asia/Dhaka";
        await connectTestDB();
    });

    afterEach(async () => {
        jest.clearAllMocks();
        await clearTestDB([User]);
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    // User creation test

    it("POST /api/users creates a valid student user", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        const res = await request(app)
            .post("/api/users")
            .set(authHeader())
            .send({
                name: "A. K. M Samioul Islam",
                email: studentEmail,
                role: "student",
                department: "cse",
                studentID: "2107051",
                batch: "2K21",
                photoURL: "https://example.com/photo.jpg",
                photoId: "photo-1",
                method: "email",
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.user.email).toBe(studentEmail);

        const dbUser = await User.findOne({ email: studentEmail });
        expect(dbUser).not.toBeNull();
        expect(dbUser.role).toBe("student");
    });

    // Blocking unauthorized access test

    it("POST /api/users returns 403 when token email does not match request email", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: otherStudentEmail });

        const res = await request(app)
            .post("/api/users")
            .set(authHeader())
            .send({
                name: "A. K. M Samioul Islam",
                email: studentEmail,
                role: "student",
                department: "cse",
                studentID: "2107051",
                batch: "2K21",
                photoURL: "https://example.com/photo.jpg",
                photoId: "photo-1",
                method: "email",
            });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Email mismatch with authenticated user");
    });

    // Blocking duplicate user creation test

    it("POST /api/users returns 200 when user already exists", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        await User.create(buildStudent());

        const res = await request(app)
            .post("/api/users")
            .set(authHeader())
            .send({
                name: "A. K. M Samioul Islam",
                email: studentEmail,
                role: "student",
                department: "cse",
                studentID: "2107051",
                batch: "2K21",
                photoURL: "https://example.com/photo.jpg",
                photoId: "photo-1",
                method: "email",
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("User already exists");
    });

    // Admin gets all users information test

    it("GET /api/admin/users allows admin to fetch users", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: adminEmail });

        await User.create([buildAdmin(), buildStudent()]);

        const res = await request(app)
            .get("/api/admin/users")
            .set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.totalUsers).toBe(2);
    });

    // User information get test

    it("GET /api/users/:email allows a user to access own profile", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        await User.create(buildStudent());

        const res = await request(app)
            .get(`/api/users/${studentEmail}`)
            .set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.email).toBe(studentEmail);
    });

    // Blocking unauthorized user from accessing another profile

    it("GET /api/users/:email blocks non-admin from accessing another profile", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        await User.create([buildStudent(), buildOtherStudent()]);

        const res = await request(app)
            .get(`/api/users/${otherStudentEmail}`)
            .set(authHeader());

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("You can access only your own profile");
    });

    // Profile update test

    it("PATCH /api/users/profile/:email updates own profile", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: facultyEmail });

        await User.create(buildFaculty());

        const res = await request(app).patch(`/api/users/profile/${facultyEmail}`).set(authHeader()).send({
            name: "Teacher Updated",
            biography: "Researcher",
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.name).toBe("teacher updated");
        expect(res.body.user.biography).toBe("Researcher");
    });

    // Blocking user to update faculty only fields test

    it("PATCH /api/users/profile/:email blocks student from updating faculty only fields", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: studentEmail });

        await User.create(buildStudent());

        const res = await request(app).patch(`/api/users/profile/${studentEmail}`).set(authHeader()).send({
            room: "303",
        });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe(
            "Only faculty can update room, biography, phone number and research interests"
        );
    });

    // Update user by admin test

    it("PATCH /api/admin/users/:email allows admin to update user status", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: adminEmail });

        await User.create([buildAdmin(), buildStudent()]);

        const res = await request(app).patch(`/api/admin/users/${studentEmail}`).set(authHeader()).send({
            status: "suspended",
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.status).toBe("suspended");
    });

    // User deletion by admin test

    it("DELETE /api/admin/users/:email allows admin to delete a non-admin user", async () => {
        verifyIdTokenMock.mockResolvedValue({ email: adminEmail });
        getUserByEmailMock.mockResolvedValue({ uid: "firebase-uid-1" });
        deleteUserMock.mockResolvedValue();
        deleteFromCloudinaryMock.mockResolvedValue({ result: "ok" });

        await User.create([buildAdmin(), buildStudent()]);

        const res = await request(app).delete(`/api/admin/users/${studentEmail}`).set(authHeader());

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("User permanently deleted");

        const deletedUser = await User.findOne({ email: studentEmail });
        expect(deletedUser).toBeNull();
    });
});
