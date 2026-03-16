import { Supervisor } from "../../models/SupervisorModel/supervisor.model.js";
import { User } from "../../models/UserModel/user.model.js";
import { Appointment } from "../../models/AppointmentModel/appointment.model.js";
import { notifyUsers } from "../../utils/NotificationEngine/notificationService.js";
import { notificationTypes } from "../../constants/notificationTypes.js";
import { formatName } from "../../utils/FormatName/formatName.js";

// Assigning supervisee

export const assignSupervisee = async (req, res) => {
    try {
        const { supervisorID, studentID, relationshipType, topic, description } = req.body;

        const user = req.dbUser;

        if (!supervisorID || !studentID || !relationshipType || !topic || !description)
            return res.status(400).json({
                success: false,
                message: "All fields required"
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

        if (user.role !== "admin" && user._id.toString() !== supervisorID.toString())
            return res.status(403).json({
                success: false,
                message: "You are not authorized to assign supervisee for this Faculty"
            });

        const student = await User.findById(studentID);

        if (!student)
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });

        if (student.role !== "student")
            return res.status(400).json({
                success: false,
                message: "Supervisee must be a student"
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
        try {
            await notifyUsers({
                receivers: [studentID],
                sender: supervisorID,
                type: notificationTypes.supervisorAssigned,
                title: `You have been assigned ${formatName(supervisor.name)} as your supervisor.`,
                message: "You have been assigned a supervisor.",
                entityModel: "Supervisor",
                redirectURL: "/supervisor"
            });

            await notifyUsers({
                receivers: [supervisorID],
                sender: user._id,
                type: notificationTypes.supervisorAssigned,
                title: "New Supervisee Assigned",
                message: `${formatName(student.name)} has been assigned to you as a supervisee.`,
                entityModel: "Supervisor",
                redirectURL: "/supervisor"
            });
        } catch (error) {
            console.error(error.message);
        }

        return res.status(201).json({
            success: true,
            message: "Supervisee assigned successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get faculty supervises

export const getSupervises = async (req, res) => {
    try {
        const supervisorID = req.params.supervisorID;

        const user = req.dbUser;

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const search = req.query.search?.trim().toLowerCase();
        const relationshipType = req.query.relationshipType?.trim().toLowerCase();

        const supervisor = await User.findById(supervisorID);

        if (!supervisor)
            return res.status(404).json({
                success: false,
                message: "Supervisor not found"
            });

        if (supervisor.role !== "faculty")
            return res.status(400).json({
                success: false,
                message: "User is not a faculty"
            });

        if (user.role !== "admin" && user._id.toString() !== supervisorID.toString())
            return res.status(403).json({
                success: false,
                message: "You are not authorized to see this Faculty's supervises"
            });

        const supervisorDoc = await Supervisor.findOne({ supervisor: supervisorID }).populate("supervises.student", "name email photoURL studentID");

        if (!supervisorDoc)
            return res.status(200).json({
                success: true,
                search: false,
                activeSupervises: [],
                completedSupervises: [],
                completedPagination: {
                    page: 1,
                    totalPages: 0,
                    totalCompleted: 0
                }
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
                    status: item.status,
                    lastMeetingAt: lastMeeting ? lastMeeting.startTime : null,
                    nextMeetingAt: nextMeeting ? nextMeeting.startTime : null
                };
            })
        );

        let filteredResult = result;

        if (relationshipType)
            filteredResult = filteredResult.filter(
                item => item.relationshipType.toLowerCase() === relationshipType
            );

        if (search)
            filteredResult = filteredResult.filter(item =>
                item.student?.name?.toLowerCase().includes(search) || item.student?.email?.toLowerCase().includes(search) || item.student?.studentID?.toLowerCase().includes(search) || item.topic?.toLowerCase().includes(search) || item.relationshipType?.toLowerCase().includes(search) || item.status?.toLowerCase().includes(search)
            );

        const activeSupervises = filteredResult.filter(supervisee => supervisee.status === "active");
        const completedAll = filteredResult.filter(supervisee => supervisee.status === "completed");

        const completedSupervises = completedAll.slice(skip, skip + limit);

        return res.status(200).json({
            success: true,
            search: !!search,
            relationshipType: relationshipType || null,
            activeSupervises,
            completedSupervises,
            completedPagination: {
                page,
                totalPages: Math.ceil(completedAll.length / limit),
                totalCompleted: completedAll.length
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get student supervisors

export const getSupervisors = async (req, res) => {
    try {
        const studentID = req.params.studentID;

        const user = req.dbUser;

        const student = await User.findById(studentID);

        if (!student)
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });

        if (student.role !== "student")
            return res.status(400).json({
                success: false,
                message: "User is not a student"
            });

        if (user.role !== "admin" && user._id.toString() !== studentID.toString())
            return res.status(403).json({
                success: false,
                message: "You are not authorized to see this student's supervisors"
            });

        const supervisorDocs = await Supervisor.find({ "supervises.student": studentID }).populate("supervisor", "name email photoURL");

        if (!supervisorDocs.length)
            return res.status(200).json({
                success: true,
                count: 0,
                supervisors: []
            });

        const appointments = await Appointment.find({
            student: studentID,
            meetingType: { $in: ["thesis", "project"] }
        }).sort({ startTime: 1 });

        const now = new Date();

        const result = [];

        for (const doc of supervisorDocs) {
            const relationships = doc.supervises.filter(
                item => item.student.toString() === studentID
            );

            for (const item of relationships) {
                const meetings = appointments.filter(a => a.faculty.toString() === doc.supervisor._id.toString() && a.meetingType === item.relationshipType);

                const nextMeeting = meetings.find(
                    a => a.status === "approved" && a.startTime > now
                );

                const lastMeeting = [...meetings].reverse().find(a => a.status === "completed" && a.startTime < now);

                result.push({
                    supervisor: doc.supervisor,
                    relationshipType: item.relationshipType,
                    topic: item.topic,
                    description: item.description,
                    status: item.status,
                    lastMeetingAt: lastMeeting ? lastMeeting.startTime : null,
                    nextMeetingAt: nextMeeting ? nextMeeting.startTime : null
                });
            }
        }

        return res.status(200).json({
            success: true,
            count: result.length,
            supervisors: result
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update supervisee status

export const updateSuperViseeStatus = async (req, res) => {
    try {
        const supervisorID = req.params.supervisorID;

        const user = req.dbUser;

        const { studentID, relationshipType, status } = req.body;

        if (!studentID || !relationshipType || !status)
            return res.status(400).json({
                success: false,
                message: "All fields required"
            });

        if (user.role !== "admin" && user._id.toString() !== supervisorID.toString())
            return res.status(403).json({
                success: false,
                message: "You are not authorized to change status"
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

        if (!relation)
            return res.status(404).json({
                success: false,
                message: "Supervisee relationship not found"
            });

        if (relation.status === "completed" && status === "active")
            return res.status(400).json({
                success: false,
                message: "Completed status cannot be changed to active"
            });

        relation.status = status;

        await supervisorDoc.save();

        return res.status(200).json({
            success: true,
            message: "Supervisee status updated"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Remove supervisee

export const removeSupervisee = async (req, res) => {
    try {
        const supervisorID = req.params.supervisorID;
        const user = req.dbUser;
        const { studentID, relationshipType } = req.body;

        if (user.role !== "admin" && user._id.toString() !== supervisorID.toString())
            return res.status(403).json({
                success: false,
                message: "You are not authorized to remove supervisee"
            });

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
            success: false,
            message: error.message
        });
    }
};