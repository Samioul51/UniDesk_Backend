import { jest } from "@jest/globals";

const leaderboardModelMock = {
    findOneAndUpdate: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
};

const repositoryModelMock = {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
    updateOne: jest.fn(),
};

const userModelMock = {
    find: jest.fn(),
};

const validateFileResourceTypeMock = jest.fn();
const deleteFromCloudinaryMock = jest.fn();
const notifyUsersMock = jest.fn();

jest.unstable_mockModule(
    "../../../../src/models/ContributionLeaderboardModel/leaderboard.model.js",
    () => ({
        Leaderboard: leaderboardModelMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/models/RepositoryModel/repository.model.js",
    () => ({
        Repository: repositoryModelMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/models/UserModel/user.model.js",
    () => ({
        User: userModelMock,
    })
);

jest.unstable_mockModule(
    "../../../../src/utils/CloudinaryValidation/cloudinaryValidation.js",
    () => ({
        validateFileResourceType: validateFileResourceTypeMock,
    })
);

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

const {
    itemUpload,
    getItems,
    getSingleItem,
    itemStatusUpdate,
} = await import(
    "../../../../src/controllers/RepositoryController/repository.controller.js"
);

const createMockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe("RepositoryController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        notifyUsersMock.mockResolvedValue();
    });

    describe("itemUpload", () => {

        // Item cant be uploaded without providing all necessary fields test

        it("returns 400 when required fields are missing", async () => {
            const req = {
                body: {},
                dbUser: { _id: "user-1" },
            };
            const res = createMockRes();

            await itemUpload(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "All fields required",
            });
        });

        // Item cant be uploaded if resource type is invalid test

        it("returns 400 when resource type is invalid", async () => {
            validateFileResourceTypeMock.mockReturnValue(false);

            const req = {
                body: {
                    title: "DSA Notes",
                    courseCode: "CSE-2200",
                    courseName: "DSA",
                    year: "2nd",
                    semester: "2nd",
                    itemType: "note",
                    url: "https://example.com/file.pdf",
                    description: "Helpful notes",
                    cloudinaryId: "cloud-1",
                    resourceType: "doc",
                    tags: ["graph"],
                },
                dbUser: { _id: "user-1" },
            };
            const res = createMockRes();

            await itemUpload(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Invalid resource type",
            });
        });

        // Item cant be uploaded when there are no valid cleaned tags test

        it("returns 400 when there are no valid cleaned tags", async () => {
            validateFileResourceTypeMock.mockReturnValue(true);

            const req = {
                body: {
                    title: "DSA Notes",
                    courseCode: "CSE-2200",
                    courseName: "DSA",
                    year: "2nd",
                    semester: "2nd",
                    itemType: "note",
                    url: "https://example.com/file.pdf",
                    description: "Helpful notes",
                    cloudinaryId: "cloud-1",
                    resourceType: "raw",
                    tags: ["", "   "],
                },
                dbUser: { _id: "user-1" },
            };
            const res = createMockRes();

            await itemUpload(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "At least one valid tag is required",
            });
        });

        // Item upload test

        it("uploads an item successfully", async () => {
            validateFileResourceTypeMock.mockReturnValue(true);
            repositoryModelMock.create.mockResolvedValue({
                _id: "repo-1",
                title: "DSA Notes",
            });
            userModelMock.find.mockReturnValue({
                select: jest.fn().mockResolvedValue([{ _id: "admin-1" }]),
            });

            const req = {
                body: {
                    title: "DSA Notes",
                    courseCode: "CSE-2200",
                    courseName: "DSA",
                    year: "2nd",
                    semester: "2nd",
                    itemType: "note",
                    url: "https://example.com/file.pdf",
                    description: "Helpful notes",
                    cloudinaryId: "cloud-1",
                    resourceType: "raw",
                    tags: [" graph ", " tree "],
                },
                dbUser: { _id: "user-1" },
            };
            const res = createMockRes();

            await itemUpload(req, res);

            expect(repositoryModelMock.create).toHaveBeenCalledWith({
                title: "DSA Notes",
                courseCode: "CSE-2200",
                courseName: "DSA",
                year: "2nd",
                semester: "2nd",
                itemType: "note",
                url: "https://example.com/file.pdf",
                cloudinaryId: "cloud-1",
                tags: ["graph", "tree"],
                resourceType: "raw",
                uploader: "user-1",
                description: "Helpful notes",
            });
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe("getItems", () => {

        // filtering check test

        it("builds public filter for non-admin users", async () => {
            const items = [{ _id: "repo-1" }];

            const limitMock = jest.fn().mockResolvedValue(items);
            const skipMock = jest.fn(() => ({ limit: limitMock }));
            const sortMock = jest.fn(() => ({ skip: skipMock }));
            const populateMock = jest.fn(() => ({ sort: sortMock }));

            repositoryModelMock.find.mockReturnValue({
                populate: populateMock,
            });
            repositoryModelMock.countDocuments.mockResolvedValue(1);

            const req = {
                query: {},
                dbUser: { _id: "user-1", role: "student" },
            };
            const res = createMockRes();

            await getItems(req, res);

            expect(repositoryModelMock.find).toHaveBeenCalledWith({
                $or: [
                    { status: "approved" },
                    { status: "pending", uploader: "user-1" },
                ],
            });
            expect(res.status).toHaveBeenCalledWith(200);
        });

        // Query filters and pagination test

        it("applies query filters and pagination", async () => {
            const items = [{ _id: "repo-1" }];

            const limitMock = jest.fn().mockResolvedValue(items);
            const skipMock = jest.fn(() => ({ limit: limitMock }));
            const sortMock = jest.fn(() => ({ skip: skipMock }));
            const populateMock = jest.fn(() => ({ sort: sortMock }));

            repositoryModelMock.find.mockReturnValue({
                populate: populateMock,
            });
            repositoryModelMock.countDocuments.mockResolvedValue(1);

            const req = {
                query: {
                    courseCode: "cse-2200",
                    year: "2nd",
                    semester: "2nd",
                    itemType: "note",
                    search: "dsa",
                    page: 2,
                    limit: 9,
                },
                dbUser: { _id: "admin-1", role: "admin" },
            };
            const res = createMockRes();

            await getItems(req, res);

            expect(repositoryModelMock.find).toHaveBeenCalledWith({
                courseCode: "CSE-2200",
                year: "2nd",
                semester: "2nd",
                itemType: "note",
                title: { $regex: "dsa", $options: "i" },
            });
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe("getSingleItem", () => {

        // Invalid item search test

        it("returns 404 when item is not found", async () => {
            repositoryModelMock.findById.mockReturnValue({
                populate: jest.fn().mockResolvedValue(null),
            });

            const req = {
                params: { id: "repo-1" },
                dbUser: { _id: "user-1", role: "student" },
            };
            const res = createMockRes();

            await getSingleItem(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Item not found",
            });
        });

        // Blocks non-admin users from accessing unapproved items test

        it("blocks non-admin users from accessing unapproved items", async () => {
            repositoryModelMock.findById.mockReturnValue({
                populate: jest.fn().mockResolvedValue({
                    _id: "repo-1",
                    status: "pending",
                }),
            });

            const req = {
                params: { id: "repo-1" },
                dbUser: { _id: "user-1", role: "student" },
            };
            const res = createMockRes();

            await getSingleItem(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Item not available",
            });
        });
    });

    describe("itemStatusUpdate", () => {

        // Blocking Cancellation without reason test

        it("returns 400 when rejected status is provided without a reason", async () => {
            repositoryModelMock.findById.mockResolvedValue({
                _id: "repo-1",
                status: "pending",
                uploader: "user-1",
            });

            const req = {
                params: { id: "repo-1" },
                body: { status: "rejected" },
                dbUser: { _id: "admin-1", role: "admin" },
            };
            const res = createMockRes();

            await itemStatusUpdate(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Rejection reason is required",
            });
        });

        // Item approval with leaderboard update test

        it("approves an item and updates leaderboard successfully", async () => {
            repositoryModelMock.findById
                .mockResolvedValueOnce({
                    _id: "repo-1",
                    status: "pending",
                    uploader: "user-1",
                })
                .mockResolvedValueOnce({
                    _id: "repo-1",
                    status: "approved",
                    uploader: "user-1",
                });

            repositoryModelMock.updateOne.mockResolvedValue({});
            leaderboardModelMock.findOneAndUpdate.mockResolvedValue({});
            notifyUsersMock.mockResolvedValue();

            const req = {
                params: { id: "repo-1" },
                body: { status: "approved" },
                dbUser: { _id: "admin-1", role: "admin" },
            };
            const res = createMockRes();

            await itemStatusUpdate(req, res);

            expect(repositoryModelMock.updateOne).toHaveBeenCalledWith(
                { _id: "repo-1" },
                {
                    $set: {
                        status: "approved",
                        approvedBy: "admin-1",
                        approvedAt: expect.any(Date),
                        rejectedReason: null,
                    },
                }
            );

            expect(leaderboardModelMock.findOneAndUpdate).toHaveBeenCalledWith(
                { user: "user-1" },
                {
                    $inc: {
                        totalPoints: 10,
                        itemsApproved: 1,
                    },
                },
                { upsert: true, new: true }
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Item status updated successfully",
                item: {
                    _id: "repo-1",
                    status: "approved",
                    uploader: "user-1",
                },
            });
        });
    });
});
