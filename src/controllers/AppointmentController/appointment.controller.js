import { Appointment } from "../../models/AppointmentModel/appointment.model.js";
import { User } from "../../models/UserModel/user.model.js";
import { Schedule } from "../../models/ScheduleModel/schedule.model.js";

// Appointment booking

export const bookAppointment = async (req, res) => {
    try {
        const { facultyID, studentID, date, startTime, endTime, purpose } = req.body;

        if (!facultyID || !studentID || !date || !startTime || !endTime || !purpose)
            return res.status(400).json({
                success: false,
                message: "All fields required"
            });

        const faculty = await User.findById(facultyID);

        if (!faculty || faculty.role !== "faculty")
            return res.status(404).json({
                success: false,
                message: "Faculty not found"
            });

        const student = await User.findById(studentID);

        if (!student || student.role !== "student")
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });

        if (facultyID === studentID)
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

        const appointment = await Appointment.create({
            faculty: facultyID,
            student: studentID,
            startTime: requestedStart,
            endTime: requestedEnd,
            purpose
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
        const id = req.params.studentID;

        const student = await User.findById(id);

        if (!student || student.role !== "student")
            return res.status(404).json({
                success:false,
                message: "Student not found"
            });

        const appointments=await Appointment.find({student:id}).sort({startTime:-1}).populate("faculty","name email");

        return res.status(200).json({
            success:true,
            count:appointments.length,
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
        const id = req.params.facultyID;

        const faculty = await User.findById(id);

        if (!faculty || faculty.role !== "faculty")
            return res.status(404).json({
                success:false,
                message: "Faculty not found"
            });

        const appointments=await Appointment.find({faculty:id}).sort({startTime:-1}).populate("student","name email");

        return res.status(200).json({
            success:true,
            count:appointments.length,
            appointments
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Appointment status update



