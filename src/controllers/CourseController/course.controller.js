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

        if (!courseCode || !courseName || !session || !year || !semester || !department)
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
            teachers: [req.dbUser._id],
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
        return res.status(500).json({ message: error.message });
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
        return res.status(500).json({ message: error.message });
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
        return res.status(500).json({ message: error.message });
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

        if (req.dbUser.role !== "faculty")
            return res.status(403).json({
                success: false,
                message: "Only faculties can join courses"
            });

        const alreadyJoined = course.teachers.some(id => id.toString() === userId.toString());

        if (alreadyJoined)
            return res.status(409).json({
                success: false,
                message: "Already instructing the course"
            });

        if (course.teachers.length === 2)
            return res.status(403).json({
                success: false,
                message: "Already two faculties instructing the course"
            });

        await Course.updateOne(
            { _id: course._id },
            { $addToSet: { teachers: userId } }
        );

        return res.status(200).json({
            success: true,
            message: "Joined course successfully"
        })

    } catch (error) {
        return res.status(500).json({ message: error.message });
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

        const isFaculty = course.teachers.some(s => s.toString() === req.dbUser._id.toString());

        if (!isFaculty)
            return res.status(400).json({
                success: false,
                message: "You are not teaching this course"
            });

        if (course.teachers.length === 1)
            return res.status(403).json({
                success: false,
                message: "Cannot leave course as the only teacher"
            });

        await Course.updateOne(
            { _id: id },
            { $pull: { teachers: req.dbUser._id } }
        );

        return res.status(200).json({
            success: true,
            message: "Left course successfully"
        })
    } catch (error) {
        return res.status(500).json({ message: error.message });
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

        const isFaculty = course.teachers.some(t => t.toString() === req.dbUser._id.toString());

        if (!isFaculty)
            return res.status(403).json({
                success: false,
                message: "You are not a teacher of this course"
            });

        const isEnrolled = course.students.some(s => s.toString() === studentId);

        if (!isEnrolled)
            return res.status(400).json({
                success: false,
                message: "Student is not enrolled in this course"
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
        return res.status(500).json({ message: error.message });
    }
};

// All courses for admin

export const adminAllCourses = async (req, res) => {
    try {
        const courses = await Course.find();
        return res.status(200).json({
            success: true,
            courses
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Single course details

export const singleCourse = async (req, res) => {
    try {
        const id = req.params.id;
        const course = await Course.findById(id);

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        if (req.dbUser.role !== "admin") {
            const isTeacher = course.teachers.some(
                t => t.toString() === req.dbUser._id.toString()
            );

            const isStudent = course.students.some(
                s => s.toString() === req.dbUser._id.toString()
            );

            if (!isTeacher && !isStudent)
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
        return res.status(500).json({ message: error.message });
    }
};

// A single user's courses

export const getMyCourses = async (req, res) => {
    try {
        const userId = req.dbUser._id;
        const role = req.dbUser.role;

        let courses;

        if (role === "student") {
            courses = await Course.find({
                students: userId
            })
                .populate("teachers", "name email")
                .populate("students", "name studentID");
        }
        else if (role === "faculty") {
            courses = await Course.find({
                teachers: userId
            })
                .populate("teachers", "name email")
                .populate("students", "name studentID");
        }
        else
            return res.status(403).json({
                success: false,
                message: "Invalid role"
            });

        return res.status(200).json({
            success: true,
            count: courses.length,
            courses
        })
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Faculty Course Update

export const updateCourse = async (req, res) => {
    try {
        const id = req.params.id;
        const { description, regenerateInvite } = req.body;

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

        const isTeacher = course.teachers.some(
            t => t.toString() === req.dbUser._id.toString()
        );

        if (!isTeacher)
            return res.status(403).json({
                success: false,
                message: "You are not a teacher of this course"
            });

        if (!description && regenerateInvite !== true)
            return res.status(400).json({
                success: false,
                message: "Nothing to update"
            });

        const updatedFields = {};

        if (description) {
            if (description.trim() === "")
                return res.status(400).json({
                    success: false,
                    message: "Description cannot be empty"
                });
            updatedFields.description = description;
        }
        
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
        return res.status(500).json({ message: error.message });
    }
};