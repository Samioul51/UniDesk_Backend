import { jest } from "@jest/globals";

const announcementModelMock = {
  create: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  updateOne: jest.fn(),
};

const courseModelMock = {
  findById: jest.fn(),
};

const validateAttachmentsMock = jest.fn();
const deleteFromCloudinaryMock = jest.fn();
const notifyUsersMock = jest.fn();

jest.unstable_mockModule(
  "../../../../src/models/AnnouncementModel/announcement.model.js",
  () => ({
    Announcement: announcementModelMock,
  })
);

jest.unstable_mockModule(
  "../../../../src/models/CourseModel/course.model.js",
  () => ({
    Course: courseModelMock,
  })
);

jest.unstable_mockModule(
  "../../../../src/utils/CloudinaryValidation/cloudinaryValidation.js",
  () => ({
    validateAttachments: validateAttachmentsMock,
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
  createAnnouncement,
  updateAnnouncement,
  getCourseAnnouncements,
  deleteAnnouncement,
} = await import(
  "../../../../src/controllers/AnnouncementController/announcement.controller.js"
);

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("AnnouncementController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createAnnouncement", () => {

    // Course not found response testing

    it("returns 404 when course is not found", async () => {
      courseModelMock.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const req = {
        params: { id: "course-1" },
        dbUser: { _id: "faculty-1", role: "faculty" },
        body: { title: "Title", description: "Desc" },
      };
      const res = createMockRes();

      await createAnnouncement(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Course not found",
      });
    });

    // Unauthorized announcement creator checking test

    it("returns 403 when creator is not a faculty of the course", async () => {
      courseModelMock.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          faculties: ["faculty-2"],
          students: [],
        }),
      });

      const req = {
        params: { id: "course-1" },
        dbUser: { _id: "faculty-1", role: "faculty" },
        body: { title: "Title", description: "Desc" },
      };
      const res = createMockRes();

      await createAnnouncement(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "You are not a faculty of this course",
      });
    });

    // Attachments validity test

    it("returns 400 when attachments are invalid", async () => {
      courseModelMock.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          faculties: ["faculty-1"],
          students: [],
        }),
      });
      validateAttachmentsMock.mockReturnValue(false);

      const req = {
        params: { id: "course-1" },
        dbUser: { _id: "faculty-1", role: "faculty" },
        body: {
          title: "Title",
          description: "Desc",
          attachments: [{ url: "x" }],
        },
      };
      const res = createMockRes();

      await createAnnouncement(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Each attachment needs url, cloudinaryId and valid resourceType",
      });
    });

    // Announcement creation test

    it("creates announcement successfully", async () => {
      const createdAnnouncement = { _id: "ann-1", title: "Title" };

      courseModelMock.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          faculties: ["faculty-1"],
          students: [],
        }),
      });
      announcementModelMock.create.mockResolvedValue(createdAnnouncement);

      const req = {
        params: { id: "course-1" },
        dbUser: { _id: "faculty-1", role: "faculty" },
        body: {
          title: "Title",
          description: "Desc",
        },
      };
      const res = createMockRes();

      await createAnnouncement(req, res);

      expect(announcementModelMock.create).toHaveBeenCalledWith({
        course: "course-1",
        title: "Title",
        description: "Desc",
        faculty: "faculty-1",
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Announcement created successfully",
        announcement: createdAnnouncement,
      });
    });
  });

  describe("updateAnnouncement", () => {

    // Announcement update which is not created test

    it("returns 404 when announcement is not found", async () => {
      announcementModelMock.findById.mockResolvedValue(null);

      const req = {
        params: { courseID: "course-1", announcementID: "ann-1" },
        dbUser: { _id: "faculty-1" },
        body: {},
      };
      const res = createMockRes();

      await updateAnnouncement(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Announcement not found",
      });
    });

    // Update bad request check

    it("returns 400 when nothing is provided to update", async () => {
      announcementModelMock.findById.mockResolvedValue({
        _id: "ann-1",
        course: { toString: () => "course-1" },
        faculty: { toString: () => "faculty-1" },
        title: "Old title",
        description: "Old desc",
        attachments: [],
      });

      courseModelMock.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          faculties: ["faculty-1"],
          students: [],
        }),
      });

      const req = {
        params: { courseID: "course-1", announcementID: "ann-1" },
        dbUser: { _id: "faculty-1" },
        body: {},
      };
      const res = createMockRes();

      await updateAnnouncement(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Nothing to update",
      });
    });

    // Unauthorized user blocking to update test

    it("returns 403 when user is not the owner of the announcement", async () => {
      announcementModelMock.findById.mockResolvedValue({
        _id: "ann-1",
        course: { toString: () => "course-1" },
        faculty: { toString: () => "faculty-2" },
        title: "Old title",
        description: "Old desc",
        attachments: [],
      });

      const req = {
        params: { courseID: "course-1", announcementID: "ann-1" },
        dbUser: { _id: "faculty-1" },
        body: { title: "New title" },
      };
      const res = createMockRes();

      await updateAnnouncement(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "You can only update your own announcements",
      });
    });

    // Announcement update test

    it("updates announcement successfully", async () => {
      announcementModelMock.findById
        .mockResolvedValueOnce({
          _id: "ann-1",
          course: { toString: () => "course-1" },
          faculty: { toString: () => "faculty-1" },
          title: "Old title",
          description: "Old desc",
          attachments: [],
        })
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({ title: "New title" }),
        });

      courseModelMock.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          faculties: ["faculty-1"],
          students: [],
        }),
      });

      const req = {
        params: { courseID: "course-1", announcementID: "ann-1" },
        dbUser: { _id: "faculty-1" },
        body: { title: "New title" },
      };
      const res = createMockRes();

      await updateAnnouncement(req, res);

      expect(announcementModelMock.updateOne).toHaveBeenCalledWith(
        { _id: "ann-1" },
        {
          $set: {
            title: "New title",
          },
        }
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Announcement updated successfully",
        announcement: { title: "New title" },
      });
    });
  });

  describe("getCourseAnnouncements", () => {

    // Unauthorized user blocking to get announcements test

    it("returns 403 when user is not involved in the course", async () => {
      courseModelMock.findById.mockResolvedValue({
        faculties: ["faculty-2"],
        students: ["student-2"],
      });

      const req = {
        params: { id: "course-1" },
        dbUser: { _id: "student-1" },
      };
      const res = createMockRes();

      await getCourseAnnouncements(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "You are not involved in this course",
      });
    });

    // Course announcements get test for authorized users

    it("returns course announcements successfully", async () => {
      const announcements = [{ _id: "ann-1", title: "Title" }];

      courseModelMock.findById.mockResolvedValue({
        faculties: ["faculty-1"],
        students: [],
      });

      const sortMock = jest.fn().mockResolvedValue(announcements);
      const populateMock = jest.fn(() => ({ sort: sortMock }));
      announcementModelMock.find.mockReturnValue({ populate: populateMock });

      const req = {
        params: { id: "course-1" },
        dbUser: { _id: "faculty-1" },
      };
      const res = createMockRes();

      await getCourseAnnouncements(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 1,
        announcements,
      });
    });
  });

  describe("deleteAnnouncement", () => {

    // Blocking delete if announcement not exist

    it("returns 404 when announcement does not exist", async () => {
      announcementModelMock.findById.mockResolvedValue(null);

      const req = {
        params: { id: "ann-1" },
        dbUser: { _id: "faculty-1" },
      };
      const res = createMockRes();

      await deleteAnnouncement(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Announcement not found",
      });
    });

    // Unauthorized user block to delete announcement test

    it("returns 403 when user did not create the announcement", async () => {
      announcementModelMock.findById.mockResolvedValue({
        faculty: { toString: () => "faculty-2" },
      });

      const req = {
        params: { id: "ann-1" },
        dbUser: { _id: "faculty-1" },
      };
      const res = createMockRes();

      await deleteAnnouncement(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "You have not created this announcement so cannot delete",
      });
    });

    // Announcement deletion test

    it("deletes announcement successfully", async () => {
      const deleteOneMock = jest.fn();

      announcementModelMock.findById.mockResolvedValue({
        faculty: { toString: () => "faculty-1" },
        attachments: [],
        deleteOne: deleteOneMock,
      });

      const req = {
        params: { id: "ann-1" },
        dbUser: { _id: "faculty-1" },
      };
      const res = createMockRes();

      await deleteAnnouncement(req, res);

      expect(deleteOneMock).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Announcement deleted successfully",
      });
    });
  });
});
