import { Course } from "../../models/CourseModel/course.model.js";
import { generateInvitationCode } from "../../utils/InvitationCode/generateInvitationCode.js";

// Course Creation

export const createCourse = async (req, res) => {
    try {
        const { courseCode, courseName, description, session, year, semester, department } = req.body;

        if (req.dbUser.role !== "faculty")
            return res.status(403).json({
                success: false,
                message: "Only faculty can create courses"
            });

        if (!courseCode || !description || !courseName || !session || !year || !semester || !department)
            return res.status(400).json({
                success: false,
                message: "All required fields must be provided"
            });

        let invitationCode;
        let exists = true;

        while (exists) {
            invitationCode = generateInvitationCode();
            exists = await Course.findOne({ invitationCode });
        }

        const course = await Course.create({
            courseCode: courseCode.trim().toUpperCase(),
            courseName: courseName.trim(),
            description,
            session: session.trim(),
            year: year.trim(),
            semester: semester.trim(),
            department: department.trim().toLowerCase(),
            faculties: [req.dbUser._id],
            invitationCode
        });

        return res.status(201).json({
            success: true,
            course,
            invitationLink: `${process.env.LIVE_LINK}/join-course?code=${invitationCode}`
        });

    } catch (error) {
        if (error.code === 11000)
            return res.status(409).json({
                message: "Course already exists for this session"
            });
        return res.status(500).json({ 
            success:false,
            message: error.message 
        });
    }
};

// Course joining by student API

export const studentJoinCourseByInvitation = async (req, res) => {
    try {
        const { invitationCode } = req.query;
        const userId = req.dbUser._id;

        if (!invitationCode)
            return res.status(400).json({
                success: false,
                message: "Invitation code is required"
            });

        const course = await Course.findOne({
            invitationCode
        });

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Invalid invitation link"
            });

        if (course.status === "completed")
            return res.status(403).json({
                success: false,
                message: "Course is completed. You cannot join."
            });

        if (req.dbUser.role !== "student")
            return res.status(403).json({
                success: false,
                message: "Only students can join courses"
            });

        const alreadyJoined = course.students.some(id => id.toString() === userId.toString());

        if (alreadyJoined)
            return res.status(409).json({
                success: false,
                message: "Already enrolled in this course"
            });

        await Course.updateOne(
            { _id: course._id },
            { $addToSet: { students: userId } }
        );

        return res.status(200).json({
            success: true,
            message: "Joined course successfully"
        })

    } catch (error) {
        return res.status(500).json({ 
            success:false,
            message: error.message 
        });
    }
};

// Course leaving by student API

export const studentLeaveCourse = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.dbUser.role !== "student")
            return res.status(403).json({
                success: false,
                message: "Only students can leave courses"
            });

        const course = await Course.findById(id);

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const isEnrolled = course.students.some(s => s.toString() === req.dbUser._id.toString());

        if (!isEnrolled)
            return res.status(400).json({
                success: false,
                message: "You are not enrolled in this course"
            });

        await Course.updateOne(
            { _id: id },
            { $pull: { students: req.dbUser._id } }
        );

        return res.status(200).json({
            success: true,
            message: "Left course successfully"
        })
    } catch (error) {
        return res.status(500).json({ 
            success:false,
            message: error.message 
        });
    }
};

// Course joining by faculty API

export const facultyJoinCourseByInvitation = async (req, res) => {
    try {
        const { code } = req.query;
        const userId = req.dbUser._id;

        if (!code)
            return res.status(400).json({
                success: false,
                message: "Invitation code is required"
            });

        const course = await Course.findOne({
            invitationCode: code
        });

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Invalid invitation link"
            });

        if (course.status === "completed")
            return res.status(403).json({
                success: false,
                message: "Course is completed. You cannot join."
            });

        if (req.dbUser.role !== "faculty")
            return res.status(403).json({
                success: false,
                message: "Only faculties can join courses"
            });

        const alreadyJoined = course.faculties.some(id => id.toString() === userId.toString());

        if (alreadyJoined)
            return res.status(409).json({
                success: false,
                message: "Already instructing the course"
            });

        if (course.faculties.length === 2)
            return res.status(403).json({
                success: false,
                message: "Already two faculties instructing the course"
            });

        await Course.updateOne(
            { _id: course._id },
            { $addToSet: { faculties: userId } }
        );

        return res.status(200).json({
            success: true,
            message: "Joined course successfully"
        })

    } catch (error) {
        return res.status(500).json({ 
            success:false,
            message: error.message 
        });
    }
};

// Course leaving by faculty API

export const facultyLeaveCourse = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.dbUser.role !== "faculty")
            return res.status(403).json({
                success: false,
                message: "Only faculty can leave courses"
            });

        const course = await Course.findById(id);

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const isFaculty = course.faculties.some(s => s.toString() === req.dbUser._id.toString());

        if (!isFaculty)
            return res.status(400).json({
                success: false,
                message: "You are not teaching this course"
            });

        if (course.status === "completed")
            return res.status(403).json({
                success: false,
                message: "Completed course cannot be left"
            });

        if (course.faculties.length === 1)
            return res.status(403).json({
                success: false,
                message: "Cannot leave course as the only faculty"
            });

        await Course.updateOne(
            { _id: id },
            { $pull: { faculties: req.dbUser._id } }
        );

        return res.status(200).json({
            success: true,
            message: "Left course successfully"
        })
    } catch (error) {
        return res.status(500).json({ 
            success:false,
            message: error.message 
        });
    }
};

// Unenroll student as faculty

export const removeStudentFromCourse = async (req, res) => {
    try {
        const { courseId, studentId } = req.params;

        if (req.dbUser.role !== "faculty")
            return res.status(403).json({
                success: false,
                message: "Only faculty can remove students"
            });

        const course = await Course.findById(courseId);

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const isFaculty = course.faculties.some(t => t.toString() === req.dbUser._id.toString());

        if (!isFaculty)
            return res.status(403).json({
                success: false,
                message: "You are not a faculty of this course"
            });

        const isEnrolled = course.students.some(s => s.toString() === studentId);

        if (!isEnrolled)
            return res.status(400).json({
                success: false,
                message: "Student is not enrolled in this course"
            });

        if (course.status === "completed")
            return res.status(403).json({
                success: false,
                message: "Cannot modify students of a completed course"
            });

        await Course.updateOne(
            { _id: courseId },
            { $pull: { students: studentId } }
        );

        return res.status(200).json({
            success: true,
            message: "Student removed from course successfully"
        });
    } catch (error) {
        return res.status(500).json({ 
            success:false,
            message: error.message 
        });
    }
};

// All courses for admin

export const adminAllCourses = async (req, res) => {
    try {
        if (req.dbUser.role !== "admin")
            return res.status(403).json({
                success: false,
                message: "Only admin can access all courses"
            });
        const courses = await Course.find();
        return res.status(200).json({
            success: true,
            courses
        });
    } catch (error) {
        return res.status(500).json({ 
            success:false,
            message: error.message 
        });
    }
};

// Single course details

export const singleCourse = async (req, res) => {
    try {
        const id = req.params.id;
        const course = await Course.findById(id).populate("faculties", "name email photoURL").populate("students", "name email photoURL studentID");

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        if (req.dbUser.role !== "admin") {
            const isFaculty = course.faculties.some(
                t => t._id.toString() === req.dbUser._id.toString()
            );

            const isStudent = course.students.some(
                s => s._id.toString() === req.dbUser._id.toString()
            );

            if (!isFaculty && !isStudent)
                return res.status(403).json({
                    success: false,
                    message: "You do not have access to this course"
                });
        }

        return res.status(200).json({
            success: true,
            course
        });
    } catch (error) {
        return res.status(500).json({ 
            success:false,
            message: error.message 
        });
    }
};

// A single user's courses

export const getMyCourses = async (req, res) => {
    try {
        const userId = req.dbUser._id;
        const role = req.dbUser.role;

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const search = req.query.search?.trim();

        const membershipFilter =
            role === "student"
                ? { students: userId }
                : role === "faculty"
                    ? { faculties: userId }
                    : null;

        if (!membershipFilter)
            return res.status(403).json({
                success: false,
                message: "Invalid role"
            });

        const searchFilter = search
            ? {
                $or: [
                    { courseCode: { $regex: search, $options: "i" } },
                    { courseName: { $regex: search, $options: "i" } },
                    { year: { $regex: search, $options: "i" } },
                    { semester: { $regex: search, $options: "i" } },
                    { session: { $regex: search, $options: "i" } },
                    { department: { $regex: search, $options: "i" } }
                ]
            }
            : {};

        const filter = {
            ...membershipFilter,
            ...searchFilter
        };

        if (search) {
            const courses = await Course.find(filter).populate("faculties", "name email photoURL").populate("students", "name email studentID").sort({ status: 1, updatedAt: -1 });

            const activeCourses = courses.filter(c => c.status === "active");
            const completedCourses = courses.filter(c => c.status === "completed");

            return res.status(200).json({
                success: true,
                search: true,
                activeCourses,
                completedCourses
            });
        }

        const activeCourses = await Course.find({
            ...membershipFilter,
            status: "active"
        }).populate("faculties", "name email photoURL").populate("students", "name email studentID").sort({ updatedAt: -1 });

        const completedCourses = await Course.find({
            ...membershipFilter,
            status: "completed"
        }).populate("faculties", "name email photoURL").populate("students", "name email studentID").sort({ updatedAt: -1 }).skip(skip).limit(limit);

        const totalCompleted = await Course.countDocuments({
            ...membershipFilter,
            status: "completed"
        });

        return res.status(200).json({
            success: true,
            search: false,
            activeCourses,
            completedCourses,
            completedPagination: {
                page,
                totalPages: Math.ceil(totalCompleted / limit),
                totalCompleted
            }
        });
    } catch (error) {
        return res.status(500).json({ 
            success:false,
            message: error.message 
        });
    }
};

// Faculty Course Update

export const updateCourse = async (req, res) => {
    try {
        const id = req.params.id;
        const { description, regenerateInvite, status } = req.body;

        if (req.dbUser.role !== "faculty")
            return res.status(403).json({
                success: false,
                message: "Only faculty can update courses"
            });

        const course = await Course.findById(id);

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const isFaculty = course.faculties.some(
            t => t.toString() === req.dbUser._id.toString()
        );

        if (!isFaculty)
            return res.status(403).json({
                success: false,
                message: "You are not a faculty of this course"
            });

        if (!description && regenerateInvite !== true && !status)
            return res.status(400).json({
                success: false,
                message: "Nothing to update"
            });

        if (course.status === "completed")
            return res.status(403).json({
                success: false,
                message: "Completed course cannot be updated"
            });

        const updatedFields = {};

        if (status) {
            if (status !== "completed")
                return res.status(400).json({
                    success: false,
                    message: "Faculty can only mark course as completed"
                });

            updatedFields.status = "completed";
        }

        if (description) {
            if (description.trim() === "")
                return res.status(400).json({
                    success: false,
                    message: "Description cannot be empty"
                });
            updatedFields.description = description;
        }

        if (status === "completed" && regenerateInvite === true)
            return res.status(400).json({
                success: false,
                message: "Cannot regenerate invite for completed course"
            });

        if (regenerateInvite === true) {
            let newCode;
            let exists = true;

            while (exists) {
                newCode = generateInvitationCode();
                exists = await Course.findOne({ invitationCode: newCode });
            }

            updatedFields.invitationCode = newCode;
        }

        const result = await Course.updateOne(
            { _id: id },
            { $set: updatedFields }
        );

        if (result.matchedCount === 0)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        return res.status(200).json({
            success: true,
            message: "Course updated successfully",
            ...(updatedFields.invitationCode && {
                newInvitationLink: `${process.env.LIVE_LINK}/join-course?code=${updatedFields.invitationCode}`
            })
        });
    } catch (error) {
        return res.status(500).json({ 
            success:false,
            message: error.message 
        });
    }
};