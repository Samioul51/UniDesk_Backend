import cron from "node-cron";
import { Assignment } from "../models/AssignmentModel/assignment.model.js";
import { Course } from "../models/CourseModel/course.model.js";
import { notificationTypes } from "../constants/notificationTypes.js";
import { Appointment } from "../models/AppointmentModel/appointment.model.js";
import { notifyUsers } from "../utils/NotificationEngine/notificationService.js";

cron.schedule("*/10 * * * *", async () => {
    try {
        console.log("Cron running...")
        const now = new Date();

        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const assignments = await Assignment.find({
            dueDate: { $gte: now, $lte: in24h },
            reminderSent: false
        });

        for (const assignment of assignments) {
            try {
                const course = await Course.findById(assignment.course).select("students");

                if (!course || course.students.length === 0)
                    continue;

                await notifyUsers({
                    receivers: course.students,
                    type: notificationTypes.assignmentDueReminder,
                    title: "Assignment Due Soon",
                    message: `Assignment "${assignment.title}" deadline is approaching.`,
                    entityID: assignment._id,
                    entityModel: "Assignment",
                    redirectURL: `/assignments/${assignment._id}`
                });

                assignment.reminderSent = true;
                await assignment.save();
            } catch (error) {
                console.log(error);
            }
        }

        const in1h = new Date(now.getTime() + 60 * 60 * 1000);

        const meetings = await Appointment.find({
            startTime: { $gte: now, $lte: in1h },
            status: "approved",
            reminderSent: false
        });

        for (const meeting of meetings) {
            try {
                await notifyUsers({
                    receivers: [meeting.student, meeting.faculty],
                    type: notificationTypes.meetingReminder,
                    title: "Meeting in 1 hour",
                    message: "Your meeting will start in 1 hour.",
                    entityID: meeting._id,
                    entityModel: "Appointment",
                    redirectURL: `/appointments/${meeting._id}`
                });

                meeting.reminderSent = true;
                await meeting.save();
            } catch (error) {
                console.log(error);
            }
        }

        // Appointment status already update for expired pending and already completed approved

        await Appointment.updateMany(
            {
                status: "approved",
                endTime: { $lt: now }
            },
            {
                $set: { status: "completed" }
            }
        );

        await Appointment.updateMany(
            {
                status: "pending",
                endTime: { $lt: now }
            },
            {
                $set: {
                    status: "rejected",
                    rejectionReason: "Appointment request expired"
                }
            }
        );
    } catch (error) {
        console.log(error);
    }
});