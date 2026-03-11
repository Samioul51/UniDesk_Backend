import { Schedule } from "../../models/ScheduleModel/schedule.model.js";
import { User } from "../../models/UserModel/user.model.js";
import { validateWeeklySchedule } from "../../utils/HelperFunctionsForScheduleUpdate/helperSchedule.js";

// Schedule creation by admin

export const scheduleCreation = async (req, res) => {
    try {
        const { facultyID, weeklySchedule } = req.body;

        if (!facultyID || !weeklySchedule)
            return res.status(400).json({
                success: false,
                message: "Faculty ID and weekly schedule are required"
            });

        const faculty = await User.findById(facultyID);

        if (!faculty)
            return res.status(404).json({
                success: false,
                message: "Faculty ID not found"
            });

        if (faculty.role !== "faculty")
            return res.status(403).json({
                success: false,
                message: "Only schedules of faculties can be created"
            });

        const days = weeklySchedule.map(d => d.day);
        const uniqueDays = new Set(days);

        if (days.length !== uniqueDays.size)
            return res.status(400).json({
                success: false,
                message: "Duplicate days are not allowed"
            });

        const existingSchedule = await Schedule.findOne({ faculty: facultyID });

        if (existingSchedule)
            return res.status(400).json({
                success: false,
                message: "Schedule already exists. Use update instead"
            });

        const schedule = await Schedule.create({
            faculty: facultyID,
            weeklySchedule
        });

        return res.status(201).json({
            success: true,
            message: "Schedule created successfully",
            schedule
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// GET faculty schedule

export const facultySchedule = async (req, res) => {
    try {
        const id = req.params.id;

        const user = await User.findById(id);

        if (!user)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        if (user.role !== "faculty")
            return res.status(403).json({
                success: false,
                message: "User is not a faculty"
            });

        const schedule = await Schedule.findOne({ faculty: id });

        if (!schedule)
            return res.status(404).json({
                success: false,
                message: "Schedule not found"
            });

        return res.status(200).json({
            success: true,
            schedule
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update schedule

export const updateSchedule = async (req, res) => {
    try {
        const user = req.dbUser;

        const { facultyID, weeklySchedule } = req.body;

        if (!facultyID || !weeklySchedule)
            return res.status(400).json({
                success: false,
                message: "Faculty ID and weekly schedule are required"
            });

        if (!Array.isArray(weeklySchedule) || weeklySchedule.length === 0)
            return res.status(400).json({
                success: false,
                message: "Weekly schedule cannot be empty"
            });

        if (user.role !== "admin" && user._id.toString() !== facultyID)
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update schedule"
            });

        const days = weeklySchedule.map(d => d.day);
        const uniqueDays = new Set(days);

        if (days.length !== uniqueDays.size)
            return res.status(400).json({
                success: false,
                message: "Duplicate days are not allowed"
            });

        const validationError = validateWeeklySchedule(weeklySchedule);

        if (validationError)
            return res.status(400).json({
                success: false,
                message: validationError
            });

        const existingSchedule = await Schedule.findOne({ faculty: facultyID });

        if (!existingSchedule)
            return res.status(404).json({
                success: false,
                message: "Schedule not found"
            });

        const existing = existingSchedule.toObject().weeklySchedule;

        const isSame = JSON.stringify(existing) === JSON.stringify(weeklySchedule);

        if (isSame)
            return res.status(200).json({
                success: true,
                message: "Nothing to update"
            });

        existingSchedule.weeklySchedule = weeklySchedule;

        await existingSchedule.save();

        return res.status(200).json({
            success: true,
            message: "Schedule updated successfully",
            schedule: existingSchedule
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};