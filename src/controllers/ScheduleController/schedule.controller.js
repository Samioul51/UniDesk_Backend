import { Schedule } from "../../models/ScheduleModel/schedule.model.js";
import { User } from "../../models/UserModel/user.model.js";

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

        if(faculty.role!=="faculty")
            return res.status(403).json({
                success: false,
                message: "Only schedules of faculties can be created"
            });

        const days=weeklySchedule.map(d=>d.day);
        const uniqueDays=new Set(days);

        if(days.length!==uniqueDays.size)
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
            message: "Schedule created successfully"
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};  