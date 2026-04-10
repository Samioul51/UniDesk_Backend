import { jest } from "@jest/globals";

const userModelMock = {
  findById: jest.fn(),
};

const appointmentModelMock = {
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
  distinct: jest.fn(),
  find: jest.fn(),
  populate: jest.fn(),
};

const scheduleModelMock = {
  findOne: jest.fn(),
};

const supervisorModelMock = {
  findOne: jest.fn(),
};

const createMeetingMock = jest.fn();
const notifyUsersMock = jest.fn();

jest.unstable_mockModule(
  "../../../../src/models/UserModel/user.model.js",
  () => ({
    User: userModelMock,
  })
);

jest.unstable_mockModule(
  "../../../../src/models/AppointmentModel/appointment.model.js",
  () => ({
    Appointment: appointmentModelMock,
  })
);

jest.unstable_mockModule(
  "../../../../src/models/ScheduleModel/schedule.model.js",
  () => ({
    Schedule: scheduleModelMock,
  })
);

jest.unstable_mockModule(
  "../../../../src/models/SupervisorModel/supervisor.model.js",
  () => ({
    Supervisor: supervisorModelMock,
  })
);

jest.unstable_mockModule(
  "../../../../src/utils/MeetLinkGeneration/meetLinkGeneration.js",
  () => ({
    createMeeting: createMeetingMock,
  })
);

jest.unstable_mockModule(
  "../../../../src/utils/NotificationEngine/notificationService.js",
  () => ({
    notifyUsers: notifyUsersMock,
  })
);

const {
  bookAppointment,
  updateAppointmentStatus,
  getAppointment,
} = await import(
  "../../../../src/controllers/AppointmentController/appointment.controller.js"
);

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("AppointmentController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("bookAppointment", () => {

    // Appointment booking input fields filled or not test

    it("returns 400 when required fields are missing", async () => {
      const req = {
        body: {},
        dbUser: { _id: "student-1", role: "student" },
      };
      const res = createMockRes();

      await bookAppointment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "All fields required",
      });
    });

    // Schedule checking test

    it("returns 400 when schedule is not found", async () => {
      userModelMock.findById.mockResolvedValue({
        _id: "faculty-1",
        role: "faculty",
      });
      scheduleModelMock.findOne.mockResolvedValue(null);

      const req = {
        body: {
          facultyID: "faculty-1",
          date: "2099-04-09",
          startTime: "10:00",
          endTime: "10:30",
          purpose: "Need advice",
          mode: "online",
          meetingType: "general",
        },
        dbUser: { _id: "student-1", role: "student", name: "Student" },
      };
      const res = createMockRes();

      await bookAppointment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Schedule not found",
      });
    });

    // Booking blocking in unavailable slots test

    it("returns 400 when requested time is int unavailable slots", async () => {
      userModelMock.findById.mockResolvedValue({
        _id: "faculty-1",
        role: "faculty",
      });
      scheduleModelMock.findOne.mockResolvedValue({
        weeklySchedule: [
          {
            day: "Thursday",
            freeSlots: [{ startTime: "11:00", endTime: "12:00" }],
          },
        ],
      });

      const req = {
        body: {
          facultyID: "faculty-1",
          date: "2099-04-09",
          startTime: "10:00",
          endTime: "10:30",
          purpose: "Need advice",
          mode: "online",
          meetingType: "general",
        },
        dbUser: { _id: "student-1", role: "student", name: "Student" },
      };
      const res = createMockRes();

      await bookAppointment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Time not in available slot",
      });
    });

    // Appointment time overlapping checking test

    it("returns 400 when the appointment overlaps with an existing slot", async () => {
      userModelMock.findById.mockResolvedValue({
        _id: "faculty-1",
        role: "faculty",
      });
      scheduleModelMock.findOne.mockResolvedValue({
        weeklySchedule: [
          {
            day: "Thursday",
            freeSlots: [{ startTime: "10:00", endTime: "12:00" }],
          },
        ],
      });
      appointmentModelMock.findOne.mockResolvedValue({ _id: "existing-app" });

      const req = {
        body: {
          facultyID: "faculty-1",
          date: "2099-04-09",
          startTime: "10:00",
          endTime: "10:30",
          purpose: "Need advice",
          mode: "online",
          meetingType: "general",
        },
        dbUser: { _id: "student-1", role: "student", name: "Student" },
      };
      const res = createMockRes();

      await bookAppointment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Faculty already has an appointment in this time slot",
      });
    });

    // Non supervisee appointment for thesis or project blocking test

    it("returns 403 when a non supervisee tries to book thesis or project meetings", async () => {
      userModelMock.findById.mockResolvedValue({
        _id: "faculty-1",
        role: "faculty",
      });
      scheduleModelMock.findOne.mockResolvedValue({
        weeklySchedule: [
          {
            day: "Thursday",
            freeSlots: [{ startTime: "10:00", endTime: "12:00" }],
          },
        ],
      });
      appointmentModelMock.findOne.mockResolvedValue(null);
      supervisorModelMock.findOne.mockResolvedValue(null);

      const req = {
        body: {
          facultyID: "faculty-1",
          date: "2099-04-09",
          startTime: "10:00",
          endTime: "10:30",
          purpose: "Thesis discussion",
          mode: "online",
          meetingType: "thesis",
        },
        dbUser: { _id: "student-1", role: "student", name: "Student" },
      };
      const res = createMockRes();

      await bookAppointment(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Only supervises can book thesis or project meetings",
      });
    });

    // Appointment creation test

    it("creates an appointment successfully with valid data", async () => {
      const createdAppointment = { _id: "app-1", purpose: "Need advice" };

      userModelMock.findById.mockResolvedValue({
        _id: "faculty-1",
        role: "faculty",
      });
      scheduleModelMock.findOne.mockResolvedValue({
        weeklySchedule: [
          {
            day: "Thursday",
            freeSlots: [{ startTime: "10:00", endTime: "12:00" }],
          },
        ],
      });
      appointmentModelMock.findOne.mockResolvedValue(null);
      supervisorModelMock.findOne.mockResolvedValue(null);
      appointmentModelMock.create.mockResolvedValue(createdAppointment);

      const req = {
        body: {
          facultyID: "faculty-1",
          date: "2099-04-09",
          startTime: "10:00",
          endTime: "10:30",
          purpose: "Need advice",
          mode: "online",
          meetingType: "general",
        },
        dbUser: { _id: "student-1", role: "student", name: "Student" },
      };
      const res = createMockRes();

      await bookAppointment(req, res);

      expect(appointmentModelMock.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Appointment booked successfully",
        appointment: createdAppointment,
      });
    });
  });

  describe("updateAppointmentStatus", () => {

    // Appointment not found response test

    it("returns 404 when appointment is not found", async () => {
      appointmentModelMock.findById.mockResolvedValue(null);

      const req = {
        params: { id: "app-1" },
        body: {},
        dbUser: { _id: "student-1", role: "student" },
      };
      const res = createMockRes();

      await updateAppointmentStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Appointment not found",
      });
    });

    // Appointment cancellation without reason blocking test

    it("returns 400 when student tries to request cancellation without a reason", async () => {
      appointmentModelMock.findById.mockResolvedValue({
        _id: "app-1",
        student: { toString: () => "student-1" },
        status: "pending",
        cancelRequestedByStudent: false,
      });

      const req = {
        params: { id: "app-1" },
        body: {},
        dbUser: { _id: "student-1", role: "student" },
      };
      const res = createMockRes();

      await updateAppointmentStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Reason required",
      });
    });

    // Meeting link generating when faculty approves test

    it("creates a meeting link when a faculty approves an online appointment", async () => {
      const saveMock = jest.fn();
      createMeetingMock.mockReturnValue("https://meet.jit.si/UniDesk-12345678");

      const appointmentDoc = {
        _id: "app-1",
        faculty: { toString: () => "faculty-1" },
        student: "student-1",
        status: "pending",
        mode: "online",
        endTime: new Date("2099-04-09T10:30:00"),
        cancelRequestedByStudent: false,
        studentCancelReason: null,
        rejectionReason: null,
        facultyCancelReason: null,
        save: saveMock,
      };

      appointmentModelMock.findById.mockResolvedValue(appointmentDoc);

      const req = {
        params: { id: "app-1" },
        body: { status: "approved" },
        dbUser: { _id: "faculty-1", role: "faculty" },
      };
      const res = createMockRes();

      await updateAppointmentStatus(req, res);

      expect(createMeetingMock).toHaveBeenCalled();
      expect(appointmentDoc.meetLink).toBe(
        "https://meet.jit.si/UniDesk-12345678"
      );
      expect(appointmentDoc.status).toBe("approved");
      expect(saveMock).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getAppointment", () => {

    // Unauthorized user blocking getting appointment data test

    it("returns 403 when the requester is not the owner", async () => {
      appointmentModelMock.findById.mockReturnValue({
        populate: jest.fn(() => ({
          populate: jest.fn().mockResolvedValue({
            student: { _id: { toString: () => "student-1" } },
            faculty: { _id: { toString: () => "faculty-1" } },
          }),
        })),
      });

      const req = {
        params: { id: "app-1" },
        dbUser: { _id: "student-2" },
      };
      const res = createMockRes();

      await getAppointment(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "You are not allowed to view this appointment",
      });
    });
  });
});
