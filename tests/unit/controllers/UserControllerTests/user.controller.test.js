import { jest } from "@jest/globals";

const userModelMock = {
  findOne: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
};

const deleteFromCloudinaryMock = jest.fn();

const authMock = {
  getUserByEmail: jest.fn(),
  deleteUser: jest.fn(),
};

jest.unstable_mockModule("../../../../src/models/UserModel/user.model.js", () => ({
  User: userModelMock,
}));

jest.unstable_mockModule(
  "../../../../src/utils/DeleteFromCloudinary/deleteFromCloudinary.js",
  () => ({
    deleteFromCloudinary: deleteFromCloudinaryMock,
  })
);

jest.unstable_mockModule("../../../../src/utils/Firebase/firebase.js", () => ({
  auth: authMock,
}));

const {
  createUser,
  getUsers,
  getSingleUser,
  updateProfile,
  adminUpdateProfile,
  adminDeleteUser,
  getUserByID,
} = await import("../../../../src/controllers/UserController/user.controller.js");

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe("UserController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createUser", () => {

    // Email missing checking

    it("returns 400 when email is missing", async () => {
      const req = {
        body: {},
        user: { email: "test@stud.kuet.ac.bd" },
      };
      const res = createMockRes();

      await createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Email is required",
      });
    });

    // Authenticated user email verifying test

    it("returns 403 when token email does not match request email", async () => {
      const req = {
        body: {
          email: "other@stud.kuet.ac.bd",
        },
        user: { email: "test@stud.kuet.ac.bd" },
      };
      const res = createMockRes();

      await createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Email mismatch with authenticated user",
      });
    });

    // Existing user check

    it("returns existing user when user already exists", async () => {
      const existingUser = {
        email: "test@stud.kuet.ac.bd",
        status: "verified",
      };

      userModelMock.findOne.mockResolvedValue(existingUser);

      const req = {
        body: {
          email: "test@stud.kuet.ac.bd",
          method: "email",
        },
        user: { email: "test@stud.kuet.ac.bd" },
      };
      const res = createMockRes();

      await createUser(req, res);

      expect(userModelMock.findOne).toHaveBeenCalledWith({
        email: "test@stud.kuet.ac.bd",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "User already exists",
        existingUser,
      });
    });
  });

  describe("getUsers", () => {

    //  Paginated users with filters testing

    it("returns paginated users with filters", async () => {
      const users = [{ email: "a@kuet.ac.bd" }, { email: "b@kuet.ac.bd" }];

      const selectMock = jest.fn().mockResolvedValue(users);
      const limitMock = jest.fn(() => ({ select: selectMock }));
      const skipMock = jest.fn(() => ({ limit: limitMock }));

      userModelMock.find.mockReturnValue({ skip: skipMock });
      userModelMock.countDocuments.mockResolvedValue(2);

      const req = {
        query: {
          search: "kuet",
          role: "student",
          page: "1",
          limit: "10",
        },
      };
      const res = createMockRes();

      await getUsers(req, res);

      expect(userModelMock.find).toHaveBeenCalledWith({
        $or: [{ name: /kuet/i }, { email: /kuet/i }],
        role: "student",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        page: 1,
        totalPages: 1,
        totalUsers: 2,
        count: 2,
        users,
      });
    });
  });

  describe("getSingleUser", () => {

    // Unauthorized access prevention test

    it("returns 403 when non-admin tries to access another profile", async () => {
      const req = {
        params: { email: "other@stud.kuet.ac.bd" },
        user: { email: "self@stud.kuet.ac.bd" },
        dbUser: { role: "student" },
      };
      const res = createMockRes();

      await getSingleUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "You can access only your own profile",
      });
    });

    // Testing user not found correct response 

    it("returns 404 when user is not found", async () => {
      userModelMock.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const req = {
        params: { email: "missing@stud.kuet.ac.bd" },
        user: { email: "missing@stud.kuet.ac.bd" },
        dbUser: { role: "student" },
      };
      const res = createMockRes();

      await getSingleUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found",
      });
    });
  });

  describe("updateProfile", () => {

    // Unauthorized user update profile prevention test

    it("returns 403 when user tries to update another profile", async () => {
      const req = {
        params: { email: "other@kuet.ac.bd" },
        body: { name: "Updated Name" },
        user: { email: "self@kuet.ac.bd" },
        dbUser: { role: "faculty" },
      };
      const res = createMockRes();

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "You can update only your own profile",
      });
    });

    // Test to see if correctly identifies that no updatable field is provided

    it("returns 400 when no updatable field is provided", async () => {
      const req = {
        params: { email: "self@kuet.ac.bd" },
        body: {},
        user: { email: "self@kuet.ac.bd" },
        dbUser: { role: "faculty" },
      };
      const res = createMockRes();

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "At least one field is required to update profile",
      });
    });

    // Testing to see student cant update faculty fields

    it("returns 403 when student tries to update faculty only fields", async () => {
      const req = {
        params: { email: "self@stud.kuet.ac.bd" },
        body: { room: "220" },
        user: { email: "self@stud.kuet.ac.bd" },
        dbUser: { role: "student" },
      };
      const res = createMockRes();

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message:
          "Only faculty can update room, biography, phone number and research interests",
      });
    });
  });

  describe("adminUpdateProfile", () => {

    // Invalid status value response checking test

    it("returns 400 for invalid status value", async () => {
      const userDoc = {
        role: "student",
      };

      userModelMock.findOne.mockResolvedValue(userDoc);

      const req = {
        params: { email: "user@stud.kuet.ac.bd" },
        body: { status: "blocked" },
      };
      const res = createMockRes();

      await adminUpdateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid status value",
      });
    });

    // Admin managed fields update checking test

    it("updates admin managed fields successfully", async () => {
      const saveMock = jest.fn();
      const userDoc = {
        role: "faculty",
        name: "old",
        room: "101",
        biography: "",
        researchInterests: [],
        phone: "",
        status: "pending",
        photoId: null,
        save: saveMock,
        toObject: jest.fn().mockReturnValue({
          name: "new name",
          status: "verified",
        }),
      };

      userModelMock.findOne.mockResolvedValue(userDoc);

      const req = {
        params: { email: "faculty@cse.kuet.ac.bd" },
        body: {
          name: "new name",
          status: "verified",
        },
      };
      const res = createMockRes();

      await adminUpdateProfile(req, res);

      expect(saveMock).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Profile updated successfully",
        user: {
          name: "new name",
          status: "verified",
        },
      });
    });
  });

  describe("adminDeleteUser", () => {

    // Admin deletion prevention test

    it("returns 403 when trying to delete an admin", async () => {
      userModelMock.findOne.mockResolvedValue({
        role: "admin",
      });

      const req = {
        params: { email: "admin@kuet.ac.bd" },
      };
      const res = createMockRes();

      await adminDeleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Admin users cannot be deleted",
      });
    });

    // Admin user deletion test

    it("deletes a non-admin user successfully", async () => {
      const deleteOneMock = jest.fn();
      const userDoc = {
        role: "student",
        photoId: "photo-123",
        deleteOne: deleteOneMock,
      };

      userModelMock.findOne.mockResolvedValue(userDoc);
      authMock.getUserByEmail.mockResolvedValue({ uid: "firebase-uid" });
      authMock.deleteUser.mockResolvedValue();
      deleteFromCloudinaryMock.mockResolvedValue({ result: "ok" });

      const req = {
        params: { email: "student@stud.kuet.ac.bd" },
      };
      const res = createMockRes();

      await adminDeleteUser(req, res);

      expect(authMock.getUserByEmail).toHaveBeenCalledWith(
        "student@stud.kuet.ac.bd"
      );
      expect(authMock.deleteUser).toHaveBeenCalledWith("firebase-uid");
      expect(deleteFromCloudinaryMock).toHaveBeenCalledWith("photo-123");
      expect(deleteOneMock).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "User permanently deleted",
      });
    });
  });

  describe("getUserByID", () => {

    // User not found checking test

    it("returns 404 when user id is not found", async () => {
      userModelMock.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const req = {
        params: { id: "123" },
      };
      const res = createMockRes();

      await getUserByID(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found",
      });
    });

    // Public user data checking test

    it("returns public user data by id", async () => {
      const user = {
        _id: "123",
        name: "Test User",
        email: "test@kuet.ac.bd",
      };

      userModelMock.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });

      const req = {
        params: { id: "123" },
      };
      const res = createMockRes();

      await getUserByID(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        user,
      });
    });
  });
});
