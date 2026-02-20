import { Supervisor } from "../../models/SupervisorModel/supervisor.model.js";
import { User } from "../../models/UserModel/user.model.js";

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