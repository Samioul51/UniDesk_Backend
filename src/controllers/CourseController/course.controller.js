import { Course } from "../../models/CourseModel/course.model.js";
import { generateInvitationCode } from "../../utils/InvitationCode/generateInvitationCode.js";

// Course Creation

export const createCourse = async (req, res) => {
    try {
        const { courseCode, courseName, description, session, year, semester, department } = req.body;

        // Mock req.user(will remove it after integrating middleware)
        req.user = {
            _id: "64f123abc456def789012345",
            role: "faculty",
            email: "teacher@test.com"
        };

        if (req.user.role !== "faculty")
            return res.status(403).json({
                success: false,
                message: "Only faculty can create courses"
            });

        const invitationCode = generateInvitationCode();

        const course = await Course.create({
            courseCode,
            courseName,
            description,
            session,
            year,
            semester,
            department,
            teachers: [req.user._id],
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

        // Mock(will remove after middleware creation)
        req.user = {
            _id: "66a12f8c9e7b1a23d4c56789",
            role: "student",
            email: "student@test.com"
        };
        const { code } = req.query;
        const userId = req.user._id;

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

        if (req.user.role !== "student")
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

// Course joining by faculty API

export const facultyJoinCourseByInvitation = async (req, res) => {
    try {

        // Mock(will remove after middleware creation)
        req.user = {
            _id: "66a12f8c9e7b1a23d4c56456",
            role: "faculty",
            email: "teacher@cse.kuet.ac.bd"
        };
        const { code } = req.query;
        const userId = req.user._id;

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

        if (req.user.role !== "faculty")
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
        const course = await Course.findOne({ _id: id });

        if (!course)
            return res.status(400).json({
                success: false,
                message: "Course not found"
            });

        return res.status(200).json({
            success: true,
            course
        });;
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// A single user's courses

export const getMyCourses = async (req, res) => {
    try {
        // Mock
        req.user = {
            _id: "66a12f8c9e7b1a23d4c56789",
            role: "student",
            email: "student@test.com"
        };

        const userId = req.user._id;
        const role = req.user.role;

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
                success:false,
                message:"Invalid role"
            });

        return res.status(200).json({
            success: true,
            count:courses.length,
            courses
        })
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
