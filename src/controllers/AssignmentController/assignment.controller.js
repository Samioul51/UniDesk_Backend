import { notificationTypes } from "../../constants/notificationTypes.js";
import { Assignment } from "../../models/AssignmentModel/assignment.model.js";
import { Course } from "../../models/CourseModel/course.model.js";
import { notifyUsers } from "../../utils/NotificationEngine/notificationService.js";
import { deleteFromCloudinary } from "../../utils/DeleteFromCloudinary/deleteFromCloudinary.js";
import { Submission } from "../../models/AssignmentSubmissionModel/submission.model.js";

// Course wise assignments

export const courseAssignments = async (req, res) => {
    try {
        const id = req.params.id;

        const user = req.dbUser;

        const course = await Course.findById(id);

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const isOwner = (course.faculties.some(t => t.toString() === user._id.toString())) || (course.students.some(s => s.toString() === user._id.toString()));

        if (!isOwner)
            return res.status(403).json({
                success: false,
                message: "You are not authorized to get this course assignments"
            });

        const assignments = await Assignment.find({ course: id });

        return res.status(200).json({
            success: true,
            message: "Assignments found successfully",
            assignments
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Uploading assignments

export const uploadAssignment = async (req, res) => {
    try {
        const id = req.params.id;

        const course = await Course.findById(id);

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const { title, description, dueDate, totalMarks, attachments } = req.body;

        const faculty = req.dbUser;

        const isFaculty = course.faculties.some(t => t.toString() === faculty._id.toString())

        if (!isFaculty)
            return res.status(403).json({
                success: false,
                message: "You are not teaching this course"
            });

        if (!title || !description || !dueDate || !totalMarks)
            return res.status(400).json({
                success: false,
                message: "Title, Description, DueDate, Total marks and uploaderID required"
            });

        const assignment = {
            course: id,
            title,
            description,
            dueDate,
            totalMarks,
            createdBy: faculty._id
        };

        if (Array.isArray(attachments) && attachments.length > 0)
            assignment.attachments = attachments;

        if (isNaN(new Date(dueDate)))
            return res.status(400).json({
                success: false,
                message: "Invalid due date"
            });

        const createdAssignment = await Assignment.create(assignment);

        await notifyUsers({
            receivers: course.students,
            sender: faculty._id,
            type: notificationTypes.newAssignment,
            title: "New Assignment Posted",
            message: `${createdAssignment.title} has been posted.`,
            entityID: createdAssignment._id,
            entityModel: "Assignment",
            redirectURL: `/assignments/${createdAssignment._id}`
        });

        return res.status(201).json({
            success: true,
            message: "Assignment uploaded successfully"
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Single assignment details

export const getAssignment = async (req, res) => {
    try {
        const { courseID, assignmentID } = req.params;

        const user = req.dbUser;

        const course = await Course.findById(courseID);

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const isOwner = (course.faculties.some(t => t.toString() === user._id.toString())) || (course.students.some(s => s.toString() === user._id.toString()));

        if (!isOwner)
            return res.status(403).json({
                success: false,
                message: "You are not authorized to get this course assignments"
            });

        const assignment = await Assignment.findOne({
            _id: assignmentID,
            course: courseID
        });

        if (!assignment)
            return res.status(404).json({
                success: false,
                message: "Assignment for this course not found"
            });

        return res.status(200).json({
            success: true,
            assignment
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Assignment deletion

export const deleteAssignment = async (req, res) => {
    try {
        const id = req.params.id;

        const faculty = req.dbUser;

        const assignment = await Assignment.findById(id);

        if (!assignment)
            return res.status(404).json({
                success: false,
                message: "Assignment not found"
            });

        const course = await Course.findById(assignment.course).select("faculties");

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const isFaculty = course.faculties.some(
            t => t.toString() === faculty._id.toString()
        );

        if (!isFaculty)
            return res.status(403).json({
                success: false,
                message: "Only course faculties can delete this assignment"
            });

        if (assignment.attachments?.length) {
            await Promise.all(
                assignment.attachments.filter(file => file.cloudinaryId).map(file => deleteFromCloudinary(file.cloudinaryId).catch((error) => {
                    console.error("Cloudinary deletion failed:", error.message)
                }))
            )
        }

        await assignment.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Assignment deleted successfully"
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Assignment updation

export const updateAssignment = async (req, res) => {
    try {
        const id = req.params.id;
        const { title, description, addAttachments, removeAttachments } = req.body;

        const faculty = req.dbUser;

        const assignment = await Assignment.findById(id);

        if (!assignment)
            return res.status(404).json({
                success: false,
                message: "Assignment not found"
            });

        const course = await Course.findById(assignment.course);

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const isFaculty = course.faculties.some(
            t => t.toString() === faculty._id.toString()
        );

        if (!isFaculty)
            return res.status(403).json({
                success: false,
                message: "Only faculty of this course can update assignments"
            });

        const cleanTitle = typeof title === "string" ? title.trim() : null;

        const cleanDescription = typeof description === "string" ? description.trim() : null;

        const hasTitle = cleanTitle && cleanTitle !== assignment.title;
        const hasDescription = cleanDescription && cleanDescription !== assignment.description;
        const hasAdd = Array.isArray(addAttachments) && addAttachments.length > 0;
        const hasRemove = Array.isArray(removeAttachments) && removeAttachments.length > 0;

        if (!hasTitle && !hasDescription && !hasAdd && !hasRemove)
            return res.status(400).json({
                success: false,
                message: "Nothing to update"
            });

        const updateQuery = {};

        if (hasTitle || hasDescription) {
            updateQuery.$set = {};
            if (hasTitle)
                updateQuery.$set.title = cleanTitle;
            if (hasDescription)
                updateQuery.$set.description = cleanDescription;
        }

        if (hasAdd)
            updateQuery.$push = {
                attachments: { $each: addAttachments }
            };

        if (hasRemove)
            updateQuery.$pull = {
                attachments: { url: { $in: removeAttachments } }
            }

        await Assignment.updateOne({ _id: id }, updateQuery);

        if (hasRemove) {
            const removedFiles = assignment.attachments.filter(
                file => removeAttachments.includes(file.url)
            );

            await Promise.all(
                removedFiles.filter(file => file.cloudinaryId).map(file => deleteFromCloudinary(file.cloudinaryId).catch((error) => {
                    console.error("Cloudinary deletion failed:", error.message)
                }))
            )
        }

        const updatedAssignment = await Assignment.findById(id).select("title");

        if (course.students?.length > 0) {
            await notifyUsers({
                receivers: course.students,
                sender: faculty._id,
                type: notificationTypes.assignmentUpdate,
                title: "Assignment Updated",
                message: `Assignment "${updatedAssignment.title}" has been updated.`,
                entityID: updatedAssignment._id,
                entityModel: "Assignment",
                redirectURL: `/assignments/${updatedAssignment._id}`
            });
        }

        return res.status(200).json({
            success: true,
            message: "Assignment updated successfully"
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Assignment submission

export const submitAssignment = async (req, res) => {
    try {
        const id = req.params.id;

        const student = req.dbUser;

        const assignment = await Assignment.findById(id);

        if (!assignment)
            return res.status(404).json({
                success: false,
                message: "Assignment not found"
            });

        const course = await Course.findById(assignment.course);

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const isStudent = course.students.some(
            s => s.toString() === student._id.toString()
        );

        if (!isStudent)
            return res.status(403).json({
                success: false,
                message: "You are not an student of this course"
            });

        const { submissionURL, cloudinaryId } = req.body;

        if (!submissionURL || !cloudinaryId)
            return res.status(400).json({
                success: false,
                message: "Submission URL required"
            });

        const now = new Date();

        if (now > assignment.dueDate)
            return res.status(403).json({
                success: false,
                message: "Submission deadline has passed"
            });

        const alreadySubmitted = await Submission.findOne({
            assignment: id,
            student: student._id
        });

        if (alreadySubmitted)
            return res.status(409).json({
                success: false,
                message: "You have already submitted this assignment"
            });

        await Submission.create({
            assignment: id,
            course: assignment.course,
            student: student._id,
            submissionURL,
            cloudinaryId
        });

        return res.status(200).json({
            success: true,
            message: "Assignment submitted successfully"
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get submissions

export const getAssignmentSubmissions = async (req, res) => {
    try {
        const id = req.params.id;

        const faculty = req.dbUser;

        const assignment = await Assignment.findById(id).lean();

        if (!assignment)
            return res.status(404).json({
                success: false,
                message: "Assignment not found"
            });

        const course = await Course.findById(assignment.course).lean();

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const isFaculty = course.faculties.some(
            t => t.toString() === faculty._id.toString()
        );

        if (!isFaculty)
            return res.status(403).json({
                success: false,
                message: "Only faculty of this course can view submissions"
            });

        const submissions=await Submission.find({
            assignment:id
        }).populate("student","name email studentID").populate("assignment","title").populate("course","courseName courseCode").lean();

        return res.status(200).json({
            success: true,
            totalSubmissions: submissions.length,
            submissions
        });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Providing marks

export const gradeSubmission = async (req, res) => {
    try {
        const { id, submissionId } = req.params;
        const { marks, feedback } = req.body;

        const faculty = req.dbUser;

        const assignment = await Assignment.findById(id);

        if (!assignment)
            return res.status(404).json({
                success: false,
                message: "Assignment not found"
            });

        const course = await Course.findById(assignment.course);

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const isFaculty = course.faculties.some(
            t => t.toString() === faculty._id.toString()
        );

        if (!isFaculty)
            return res.status(403).json({
                success: false,
                message: "Only faculty of this course can grade submissions"
            });

        const submission = assignment.submissions.id(submissionId);

        if (!submission)
            return res.status(404).json({
                success: false,
                message: "Submission not found"
            });

        if (marks == null)
            return res.status(400).json({
                success: false,
                message: "Marks required"
            });

        if (marks > assignment.totalMarks)
            return res.status(400).json({
                success: false,
                message: "Marks exceed total marks"
            });

        submission.marks = marks;
        if (feedback)
            submission.feedback = feedback;

        await assignment.save();

        await notifyUsers({
            receivers: [submission.student],
            sender: faculty._id,
            type: notificationTypes.gradePublished,
            title: "Marks Published",
            message: `Your submission for "${assignment.title}" has been graded.`,
            entityID: assignment._id,
            entityModel: "Assignment",
            redirectURL: `/assignments/${assignment._id}`
        });

        return res.status(200).json({
            success: true,
            message: "Submission graded successfully"
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Unsubmit assignment by student

export const unsubmitAssignment = async (req, res) => {
    try {
        const id = req.params.id;

        const student = req.dbUser;

        const assignment = await Assignment.findById(id).select("dueDate submissions");

        if (!assignment)
            return res.status(404).json({
                success: false,
                message: "Assignment not found"
            });

        if (new Date() > assignment.dueDate)
            return res.status(403).json({
                success: false,
                message: "Submission cannot be deleted after due date"
            });

        const submission = assignment.submissions.find(
            s => s.student.toString() === student._id.toString()
        );

        if (!submission)
            return res.status(404).json({
                success: false,
                message: "Submission not found"
            });

        if (submission.marks !== null)
            return res.status(403).json({
                success: false,
                message: "Graded submissions cannot be unsubmitted"
            });

        if (submission.cloudinaryId) {
            try {
                await deleteFromCloudinary(submission.cloudinaryId);
            } catch (error) {
                console.error("Cloudinary deletion failed:", error.message);
            }
        }

        await Assignment.updateOne(
            { _id: id },
            { $pull: { submissions: { student: student._id } } }
        );

        return res.status(200).json({
            success: true,
            message: "Submission unsubmitted successfully"
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

