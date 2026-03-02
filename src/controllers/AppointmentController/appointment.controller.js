import { User } from "../../models/UserModel/user.model.js";
import { Appointment } from "../../models/AppointmentModel/appointment.model.js";
import { Schedule } from "../../models/ScheduleModel/schedule.model.js";
import { Supervisor } from "../../models/SupervisorModel/supervisor.model.js";
import { createMeeting } from "../../utils/MeetLinkGeneration/meetLinkGeneration.js";
import { notifyUsers } from "../../utils/NotificationEngine/notificationService.js";
import { notificationTypes } from "../../constants/notificationTypes.js";

// Appointment booking

export const bookAppointment = async (req, res) => {
    try {
        const { facultyID, date, startTime, endTime, purpose, mode, meetingType } = req.body;

        const student = req.dbUser;

        if (!facultyID || !date || !startTime || !endTime || !purpose)
            return res.status(400).json({
                success: false,
                message: "All fields required"
            });

        if (!mode || !["online", "in-person"].includes(mode))
            return res.status(400).json({
                success: false,
                message: "Appointment mode required"
            });

        const faculty = await User.findById(facultyID);

        if (!faculty || faculty.role !== "faculty")
            return res.status(404).json({
                success: false,
                message: "Faculty not found"
            });

        if (student.role !== "student")
            return res.status(403).json({
                success: false,
                message: "Only students can book appointments"
            });

        if (facultyID.toString() === student._id.toString())
            return res.status(400).json({
                success: false,
                message: "Faculty cannot book appointment with themselves"
            });

        const schedule = await Schedule.findOne({ faculty: facultyID });

        if (!schedule)
            return res.status(400).json({
                success: false,
                message: "Schedule not found"
            });

        if (isNaN(new Date(date)))
            return res.status(400).json({
                success: false,
                message: "Invalid date format"
            });

        const dayName = new Date(date).toLocaleString("en-US", { weekday: "long" });

        const daySchedule = schedule.weeklySchedule.find(d => d.day === dayName);

        if (!daySchedule)
            return res.status(400).json({
                success: false,
                message: "Faculty not available on this day"
            });

        const requestedStart = new Date(`${date}T${startTime}:00`);
        const requestedEnd = new Date(`${date}T${endTime}:00`);

        if (requestedStart < new Date())
            return res.status(400).json({
                success: false,
                message: "Cannot book appointment in the past"
            });

        if (requestedEnd <= requestedStart)
            return res.status(400).json({
                success: false,
                message: "Invalid time range"
            });

        const isInsideFreeSlot = daySchedule.freeSlots.some(slot => {
            const slotStart = new Date(`${date}T${slot.startTime}:00`);
            const slotEnd = new Date(`${date}T${slot.endTime}:00`);

            return requestedStart >= slotStart && requestedEnd <= slotEnd;
        });

        if (!isInsideFreeSlot)
            return res.status(400).json({
                success: false,
                message: "Time not in available slot"
            });

        const overlapping = await Appointment.findOne({
            faculty: facultyID,
            status: { $in: ["pending", "approved"] },
            startTime: { $lt: requestedEnd },
            endTime: { $gt: requestedStart }
        });

        if (overlapping)
            return res.status(400).json({
                success: false,
                message: "Faculty already has an appointment in this time slot"
            });

        const supervisorDoc = await Supervisor.findOne({
            supervisor: facultyID,
            "supervises.student": student._id
        });

        const isSupervisee = !!supervisorDoc;

        if (!isSupervisee && ["thesis", "project"].includes(meetingType))
            return res.status(403).json({
                success: false,
                message: "Only supervises can book thesis or project meetings"
            });

        const appointment = await Appointment.create({
            faculty: facultyID,
            student: student._id,
            startTime: requestedStart,
            endTime: requestedEnd,
            purpose,
            mode,
            meetingType
        });

        await notifyUsers({
            receivers: [facultyID],
            sender: student._id,
            type: notificationTypes.appointmentRequest,
            title: "New Appointment Request",
            message: `${student.name} requested a meeting.`,
            entityID: appointment._id,
            entityModel: "Appointment",
            redirectURL: `/appointments/${appointment._id}`
        });

        return res.status(201).json({
            success: true,
            message: "Appointment booked successfully",
            appointment
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Get student appointments

export const getStudentAppointments = async (req, res) => {
    try {
        const id = req.params.id;

        const student = req.dbUser;

        if (id.toString() !== student._id.toString())
            return res.status(403).json({
                success: false,
                message: "You can only see your own appointments"
            });

        const appointments = await Appointment.find({ student: student._id }).sort({ startTime: -1 }).populate("faculty", "name email room");

        return res.status(200).json({
            success: true,
            count: appointments.length,
            appointments
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Get faculty appointments

export const getFacultyAppointments = async (req, res) => {
    try {
        const id = req.params.id;

        const faculty = req.dbUser;

        if (id.toString() !== faculty._id.toString())
            return res.status(403).json({
                success: false,
                message: "You can see your own appointments"
            });

        const appointments = await Appointment.find({ faculty: faculty._id }).sort({ startTime: -1 }).populate("student", "name email");

        return res.status(200).json({
            success: true,
            count: appointments.length,
            appointments
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Appointment status update

export const updateAppointmentStatus = async (req, res) => {
    try {
        const id = req.params.id;

        const appointment = await Appointment.findById(id);

        if (!appointment)
            return res.status(404).json({
                success: false,
                message: "Appointment not found"
            });

        const { status, reason } = req.body;

        const user = req.dbUser;//

        if (user.role === "student") {
            if (appointment.student.toString() !== user._id.toString())
                return res.status(403).json({
                    success: false,
                    message: "This appointment belongs to another Student"
                });

            if (!["pending", "approved"].includes(appointment.status))
                return res.status(400).json({
                    success: false,
                    message: "Cannot cancel this appointment"
                });

            if (appointment.cancelRequestedByStudent)
                return res.status(400).json({
                    success: false,
                    message: "Cancellation already requested"
                });

            if (!reason)
                return res.status(400).json({
                    success: false,
                    message: "Reason required"
                });
            appointment.cancelRequestedByStudent = true;
            appointment.studentCancelReason = reason;

            await appointment.save();

            await notifyUsers({
                receivers: [appointment.faculty],
                sender: user._id,
                type: notificationTypes.appointmentStatusChange,
                title: "Cancellation Requested",
                message: "Student requested to cancel the appointment.",
                entityID: appointment._id,
                entityModel: "Appointment",
                redirectURL: `/appointments/${appointment._id}`
            });

            return res.status(200).json({
                success: true,
                message: "Cancellation request sent to faculty",
                appointment
            });
        }

        if (user.role === "faculty") {
            if (appointment.faculty.toString() !== user._id.toString())
                return res.status(403).json({
                    success: false,
                    message: "This appointment belongs to another Faculty"
                });

            if (appointment.endTime < new Date())
                return res.status(400).json({
                    success: false,
                    message: "Cannot modify past appointments"
                });

            if (["completed", "rejected", "cancelled"].includes(appointment.status))
                return res.status(400).json({
                    success: false,
                    message: "Appointment already finished"
                });

            if (!status)
                return res.status(400).json({
                    success: false,
                    message: "Valid status required"
                });

            const allowedFacultyStatuses = ["approved", "rejected", "completed", "cancelled"];

            if (!allowedFacultyStatuses.includes(status))
                return res.status(400).json({
                    success: false,
                    message: "Invalid status value"
                });

            if (appointment.status === "pending") {
                if (!["approved", "rejected"].includes(status))
                    return res.status(400).json({
                        success: false,
                        message: "Pending appointment can only be rejected or approved"
                    });

                if (status === "approved") {
                    appointment.cancelRequestedByStudent = false;
                    appointment.studentCancelReason = null;
                    appointment.rejectionReason = null;
                    appointment.facultyCancelReason = null;

                    if (appointment.mode === "online") {
                        const meetLink = createMeeting();
                        appointment.meetLink = meetLink;
                    }
                }

                if (status === "rejected") {
                    if (!reason)
                        return res.status(400).json({
                            success: false,
                            message: "Rejection requires reason"
                        });
                    appointment.rejectionReason = reason;
                }
            }
            else if (appointment.status === "approved") {
                if (!["completed", "cancelled"].includes(status))
                    return res.status(400).json({
                        success: false,
                        message: "Approved appointments can only be completed or cancelled"
                    });

                if (status === "cancelled") {
                    if (!reason)
                        return res.status(400).json({
                            success: false,
                            message: "Cancellation requires reason"
                        });
                    appointment.facultyCancelReason = reason;
                    appointment.cancelRequestedByStudent = false;
                }
            }

            appointment.status = status;

            await appointment.save();

            await notifyUsers({
                receivers: [appointment.student],
                sender: user._id,
                type: notificationTypes.appointmentStatusChange,
                title: "Appointment Status Updated",
                message: `Your appointment is now ${appointment.status}.`,
                entityID: appointment._id,
                entityModel: "Appointment",
                redirectURL: `/appointments/${appointment._id}`
            });

            return res.status(200).json({
                success: true,
                message: "Appointment status updated successfully"
            });
        }

        return res.status(403).json({
            success: false,
            message: "Unauthorized role"
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Get single appointment

export const getAppointment = async (req, res) => {
    try {
        const id = req.params.id;

        const user = req.dbUser;
        
        const appointment = await Appointment.findById(id).populate("faculty", "name email room").populate("student", "name email");

        if (!appointment)
            return res.status(404).json({
                success: false,
                message: "Appointment not found"
            });

        const isOwner = (appointment.student._id.toString() === user._id.toString()) || (appointment.faculty._id.toString() === user._id.toString());

        if (!isOwner)
            return res.status(403).json({
                success: false,
                message: "You are not allowed to view this appointment"
            });

        return res.status(200).json({
            success: true,
            appointment
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

