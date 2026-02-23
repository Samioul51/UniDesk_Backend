import { Supervisor } from "../../models/SupervisorModel/supervisor.model.js";
import { User } from "../../models/UserModel/user.model.js";
import { Appointment } from "../../models/AppointmentModel/appointment.model.js";
import { notifyUsers } from "../../utils/NotificationEngine/notificationService.js";
import { notificationTypes } from "../../constants/notificationTypes.js";

// Assigning supervisee

export const assignSupervisee = async (req, res) => {
    try {
        const { supervisorID, studentID, relationshipType, topic, description } = req.body;

        if (!supervisorID || !studentID || !relationshipType || !topic || !description)
            return res.status(400).json({
                success: false,
                message: "All fields required"
            });

        if (supervisorID === studentID)
            return res.status(400).json({
                success: false,
                message: "Supervisor cannot supervise themselves"
            });

        const supervisor = await User.findById(supervisorID);

        if (!supervisor)
            return res.status(404).json({
                success: false,
                message: "Supervisor not found"
            });

        if (supervisor.role !== "faculty")
            return res.status(404).json({
                success: false,
                message: "Supervisor must be a faculty"
            });

        let supervisorDoc = await Supervisor.findOne({ supervisor: supervisorID });

        if (!supervisorDoc)
            supervisorDoc = await Supervisor.create({
                supervisor: supervisorID,
                supervises: []
            });

        const isAssigned = supervisorDoc.supervises.some(
            s => s.student.toString() === studentID && s.relationshipType === relationshipType
        );

        if (isAssigned)
            return res.status(400).json({
                success: false,
                message: `Student already assigned to this supervisor for ${relationshipType}`
            });

        supervisorDoc.supervises.push({
            student: studentID,
            relationshipType,
            topic,
            description
        });

        await supervisorDoc.save();

        await notifyUsers({
            receivers: [studentID],
            sender: supervisorID,
            type: notificationTypes.supervisorAssigned,
            title: "Supervisor Assigned",
            message: "You have been assigned a supervisor.",
            entityModel: "Supervisor",
            redirectURL: "/supervisor"
        });

        return res.status(201).json({
            success: true,
            message: "Supervisee assigned successfully"
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Get faculty supervises

export const getSupervises = async (req, res) => {
    try {
        const supervisorID = req.params.supervisorID;

        const supervisor = await User.findById(supervisorID);

        if (!supervisor)
            return res.status(404).json({
                success: false,
                message: "Supervisor not found"
            });

        const supervisorDoc = await Supervisor.findOne({ supervisor: supervisorID }).populate("supervises.student", "name email");

        if (!supervisorDoc)
            return res.status(200).json({
                success: true,
                count: 0,
                supervises: []
            });

        const result = await Promise.all(
            supervisorDoc.supervises.map(async (item) => {
                const nextMeeting = await Appointment.findOne({
                    faculty: supervisorID,
                    student: item.student._id,
                    meetingType: item.relationshipType,
                    status: "approved",
                    startTime: { $gt: new Date() }
                }).sort({ startTime: 1 });

                const lastMeeting = await Appointment.findOne({
                    faculty: supervisorID,
                    student: item.student._id,
                    meetingType: item.relationshipType,
                    status: "completed",
                    startTime: { $lt: new Date() }
                }).sort({ startTime: -1 });

                return {
                    student: item.student,
                    relationshipType: item.relationshipType,
                    topic: item.topic,
                    description: item.description,
                    lastMeetingAt: lastMeeting ? lastMeeting.startTime : null,
                    nextMeetingAt: nextMeeting ? nextMeeting.startTime : null
                };
            })
        );

        return res.status(200).json({
            success: true,
            count: result.length,
            supervises: result
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Get student supervisors

export const getSupervisors = async (req, res) => {
    try {
        const studentID = req.params.studentID;

        const student = await User.findById(studentID);

        if (!student)
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });

        const supervisorDoc = await Supervisor.findOne({ "supervises.student": studentID }).populate("supervisor", "name email");

        if (!supervisorDoc)
            return res.status(200).json({
                success: true,
                count: 0,
                supervisors: []
            });

        const relationships = supervisorDoc.supervises.filter(
            item => item.student.toString() === studentID
        );

        const result = await Promise.all(
            relationships.map(async (item) => {
                const nextMeeting = await Appointment.findOne({
                    faculty: supervisorDoc.supervisor._id,
                    student: studentID,
                    meetingType: item.relationshipType,
                    status: "approved",
                    startTime: { $gt: new Date() }
                }).sort({ startTime: 1 });

                const lastMeeting = await Appointment.findOne({
                    faculty: supervisorDoc.supervisor._id,
                    student: studentID,
                    meetingType: item.relationshipType,
                    status: "completed",
                    startTime: { $lt: new Date() }
                }).sort({ startTime: -1 });

                return {
                    supervisor: supervisorDoc.supervisor,
                    relationshipType: item.relationshipType,
                    topic: item.topic,
                    description: item.description,
                    lastMeetingAt: lastMeeting ? lastMeeting.startTime : null,
                    nextMeetingAt: nextMeeting ? nextMeeting.startTime : null
                };
            })
        );

        return res.status(200).json({
            success: true,
            count: result.length,
            supervisors: result
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Update supervisee status

export const updateSuperViseeStatus = async (req, res) => {
    try {
        const supervisorID = req.params.supervisorID;
        const { studentID, relationshipType, status } = req.body;

        if (!studentID || !relationshipType || !status)
            return res.status(400).json({
                success: false,
                message: "All fields required"
            });

        if (!["active", "completed"].includes(status))
            return res.status(400).json({
                success: false,
                message: "Invalid status"
            });

        const supervisorDoc = await Supervisor.findOne({ supervisor: supervisorID });

        if (!supervisorDoc)
            return res.status(404).json({
                success: false,
                message: "No supervisor record found"
            });

        const relation = supervisorDoc.supervises.find(
            s => s.student.toString() === studentID &&
                s.relationshipType === relationshipType
        );

        if (relation.status === "completed" && status === "active")
            return res.status(400).json({
                success: false,
                message: "Completed status cannot be changed to active"
            });
        if (!relation)
            return res.status(404).json({
                success: false,
                message: "Supervisee relationship not found"
            });

        relation.status = status;

        await supervisorDoc.save();

        return res.status(200).json({
            success: true,
            message: "Supervisee status updated"
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Remove supervisee

export const removeSupervisee = async (req, res) => {
    try {
        const supervisorID = req.params.supervisorID;
        const { studentID, relationshipType } = req.body;

        if (!studentID || !relationshipType)
            return res.status(400).json({
                success: false,
                message: "All fields required"
            });

        const supervisorDoc = await Supervisor.findOne({ supervisor: supervisorID });

        if (!supervisorDoc)
            return res.status(404).json({
                success: false,
                message: "No supervisor record found"
            });

        const relation = supervisorDoc.supervises.find(
            s => s.student.toString() === studentID &&
                s.relationshipType === relationshipType
        );

        if (!relation)
            return res.status(404).json({
                success: false,
                message: "Supervisee relationship not found"
            });

        await Supervisor.updateOne(
            { supervisor: supervisorID },
            {
                $pull: {
                    supervises: {
                        student: studentID,
                        relationshipType: relationshipType
                    }
                }
            }
        );

        return res.status(200).json({
            success: true,
            message: "Supervisee removed successfully"
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};