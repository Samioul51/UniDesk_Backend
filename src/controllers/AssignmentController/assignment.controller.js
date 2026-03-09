import { notificationTypes } from "../../constants/notificationTypes.js";
import { Assignment } from "../../models/AssignmentModel/assignment.model.js";
import { Course } from "../../models/CourseModel/course.model.js";
import { notifyUsers } from "../../utils/NotificationEngine/notificationService.js";
import { deleteFromCloudinary } from "../../utils/DeleteFromCloudinary/deleteFromCloudinary.js";
import { Submission } from "../../models/AssignmentSubmissionModel/submission.model.js";
import { validateAttachments } from "../../utils/CloudinaryValidation/cloudinaryValidation.js";
import { toMinuteTime } from "../../utils/ToMinuteTime/toMinuteTime.js";

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
            success: false,
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
                message: "Title, Description, DueDate, Total marks required"
            });

        const assignment = {
            course: id,
            title,
            description,
            dueDate,
            totalMarks,
            createdBy: faculty._id
        };

        if (attachments !== undefined) {
            if (!Array.isArray(attachments) || !validateAttachments(attachments)) {
                return res.status(400).json({
                    success: false,
                    message: "Each attachment needs url, cloudinaryId and valid resourceType"
                });
            }

            if (attachments.length > 0)
                assignment.attachments = attachments;
        }

        if (isNaN(new Date(dueDate)))
            return res.status(400).json({
                success: false,
                message: "Invalid due date"
            });

        const createdAssignment = await Assignment.create(assignment);

        try {
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
        } catch (error) {
            console.error(error.message);
        }

        return res.status(201).json({
            success: true,
            message: "Assignment uploaded successfully",
            assignment: createdAssignment
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
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

        const isFaculty = course.faculties.some(t => t.toString() === user._id.toString())

        const isStudent = course.students.some(s => s.toString() === user._id.toString())

        const isOwner = isFaculty || isStudent;

        if (!isOwner)
            return res.status(403).json({
                success: false,
                message: "You are not authorized to get this course assignments"
            });

        const assignment = await Assignment.findOne({
            _id: assignmentID,
            course: courseID
        }).lean();

        if (!assignment)
            return res.status(404).json({
                success: false,
                message: "Assignment for this course not found"
            });

        let submission = null;

        if (isStudent)
            submission = await Submission.findOne({
                assignment: assignmentID,
                student: user._id
            }).populate("gradedBy", "name email").lean();

        return res.status(200).json({
            success: true,
            assignment,
            submission
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
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
                assignment.attachments.filter(file => file.cloudinaryId).map(file => deleteFromCloudinary(file.cloudinaryId, file.resourceType || "raw").catch((error) => {
                    console.error("Cloudinary deletion failed:", error.message)
                }))
            )
        }

        await Submission.deleteMany({ assignment: id });

        await assignment.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Assignment deleted successfully"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Assignment updation

export const updateAssignment = async (req, res) => {
    try {
        const id = req.params.id;
        const { title, description, dueDate, totalMarks, addAttachments, removeAttachments } = req.body;

        if (addAttachments !== undefined) {
            if (!Array.isArray(addAttachments) || !validateAttachments(addAttachments)) {
                return res.status(400).json({
                    success: false,
                    message: "Each new attachment needs url, cloudinaryId and valid resourceType"
                });
            }
        }

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

        const parsedDueDate = (dueDate !== undefined && dueDate !== null && dueDate !== "") ? new Date(dueDate) : null;

        if (dueDate !== undefined && (Number.isNaN(parsedDueDate?.getTime?.())))
            return res.status(400).json({
                success: false,
                message: "Invalid due date"
            });

        const parsedTotalMarks = (totalMarks !== undefined && totalMarks !== null && totalMarks !== "") ? Number(totalMarks) : null;

        if (totalMarks !== undefined && (!Number.isFinite(parsedTotalMarks) || parsedTotalMarks <= 0))
            return res.status(400).json({
                success: false,
                message: "totalMarks must be greater than 0"
            });

        const hasTitle = cleanTitle && cleanTitle !== assignment.title;
        const hasDescription = cleanDescription && cleanDescription !== assignment.description;
        const hasDueDate = parsedDueDate && toMinuteTime(parsedDueDate) !== toMinuteTime(assignment.dueDate);
        const hasTotalMarks = parsedTotalMarks && parsedTotalMarks !== assignment.totalMarks;
        const hasAdd = Array.isArray(addAttachments) && addAttachments.length > 0;
        const hasRemove = Array.isArray(removeAttachments) && removeAttachments.length > 0;

        if (!hasTitle && !hasDescription && !hasDueDate && !hasTotalMarks && !hasAdd && !hasRemove)
            return res.status(400).json({
                success: false,
                message: "Nothing to update"
            });

        const updateQuery = {};

        if (hasTitle || hasDescription || hasDueDate || hasTotalMarks) {
            updateQuery.$set = {};
            if (hasTitle)
                updateQuery.$set.title = cleanTitle;
            if (hasDescription)
                updateQuery.$set.description = cleanDescription;
            if (hasDueDate)
                updateQuery.$set.dueDate = parsedDueDate;
            if (hasTotalMarks)
                updateQuery.$set.totalMarks = parsedTotalMarks;
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
                removedFiles.filter(file => file.cloudinaryId).map(file => deleteFromCloudinary(file.cloudinaryId, file.resourceType || "raw").catch((error) => {
                    console.error("Cloudinary deletion failed:", error.message)
                }))
            )
        }

        const updatedAssignment = await Assignment.findById(id);

        if (course.students?.length > 0) {
            try {
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
            } catch (error) {
                console.error(error.message);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Assignment updated successfully",
            assignment: updatedAssignment
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
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

        const { submissionURL, cloudinaryId, resourceType } = req.body;

        if (!submissionURL || !cloudinaryId || !resourceType)
            return res.status(400).json({
                success: false,
                message: "Submission URL,cloudinaryId and resource type required"
            });

        const allowedTypes = ["image", "video", "raw"];
        if (!allowedTypes.includes(resourceType))
            return res.status(400).json({
                success: false,
                message: "Invalid resource type"
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

        const submission = await Submission.create({
            assignment: id,
            course: assignment.course,
            student: student._id,
            submissionURL,
            cloudinaryId,
            resourceType
        });

        return res.status(200).json({
            success: true,
            message: "Assignment submitted successfully",
            submission
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
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

        const submissions = await Submission.find({
            assignment: id
        }).populate("student", "name email studentID").populate("assignment", "title").populate("course", "courseName courseCode").lean();

        return res.status(200).json({
            success: true,
            totalSubmissions: submissions.length,
            submissions
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Providing marks

export const gradeSubmission = async (req, res) => {
    try {
        const { id, submissionId } = req.params;
        const { marks, feedback } = req.body;

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
                message: "Only faculty of this course can grade submissions"
            });

        const submission = await Submission.findOne({
            _id: submissionId,
            assignment: id
        });

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

        if (marks < 0)
            return res.status(400).json({
                success: false,
                message: "Negative marks cannot be provided"
            });

        submission.marks = marks;
        submission.feedback = feedback || "";
        submission.isGraded = true;
        submission.gradedBy = faculty._id;

        await submission.save();

        try {
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
        } catch (error) {
            console.error(error.message);
        }

        return res.status(200).json({
            success: true,
            message: "Submission graded successfully",
            submission
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Unsubmit assignment by student

export const unsubmitAssignment = async (req, res) => {
    try {
        const id = req.params.id;

        const student = req.dbUser;

        const submission = await Submission.findById(id);

        if (!submission)
            return res.status(404).json({
                success: false,
                message: "Submission not found"
            });

        if (submission.student.toString() !== student._id.toString())
            return res.status(403).json({
                success: false,
                message: "You are not allowed to delete this submission"
            });

        const assignment = await Assignment.findById(submission.assignment).select("dueDate course");

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
                message: "You are not enrolled in this course"
            });

        if (new Date() > assignment.dueDate)
            return res.status(403).json({
                success: false,
                message: "Submission cannot be deleted after due date"
            });

        if (submission.marks !== null)
            return res.status(403).json({
                success: false,
                message: "Graded submissions cannot be unsubmitted"
            });

        if (submission.cloudinaryId) {
            try {
                await deleteFromCloudinary(submission.cloudinaryId, submission.resourceType || "raw");
            } catch (error) {
                console.error("Cloudinary deletion failed:", error.message);
            }
        }

        await submission.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Submission unsubmitted successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Recheck request by student

export const requestRecheckSubmission = async (req, res) => {
    try {
        const id = req.params.id;
        const { message } = req.body;

        const student = req.dbUser;

        const submission = await Submission.findOne({
            _id: id,
            student: student._id
        });

        if (!submission)
            return res.status(404).json({
                success: false,
                message: "Submission not found"
            });

        if (!submission.isGraded)
            return res.status(400).json({
                success: false,
                message: "Submission is not graded yet"
            });

        if (submission.recheckRequested)
            return res.status(400).json({
                success: false,
                message: "Recheck already requested"
            });

        submission.recheckRequested = true;
        submission.recheckMessage = message || "";

        await submission.save();

        return res.status(200).json({
            success: true,
            message: "Recheck request submitted successfully",
            submission
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Resolve recheck

export const resolveRecheckSubmission = async (req, res) => {
    try {
        const id = req.params.id;
        const { marks, feedback } = req.body;

        const faculty = req.dbUser;

        const submission = await Submission.findById(id).populate("assignment");

        if (!submission)
            return res.status(404).json({
                success: false,
                message: "Submission not found"
            });

        const course = await Course.findById(submission.assignment.course);

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
                message: "Only course faculty can resolve recheck"
            });

        if (!submission.recheckRequested)
            return res.status(400).json({
                success: false,
                message: "No recheck requested"
            });

        if (submission.recheckResolved)
            return res.status(400).json({
                success: false,
                message: "Recheck already resolved"
            });

        if (marks !== undefined) {
            if (marks > submission.assignment.totalMarks)
                return res.status(400).json({
                    success: false,
                    message: "Marks exceed total marks"
                });
            if (marks < 0)
                return res.status(400).json({
                    success: false,
                    message: "Negative marks cannot be provided"
                });
            submission.marks = marks;
        }

        submission.recheckResolved = true;
        submission.recheckFeedback = feedback || "";
        submission.gradedBy = faculty._id;

        await submission.save();

        return res.status(200).json({
            success: true,
            message: "Recheck resolved successfully",
            submission
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all courses pending assignments

export const getPendingGrading = async (req, res) => {
    try {
        const faculty = req.dbUser;

        const courses = await Course.find({
            faculties: faculty._id,
            status: "active"
        }).select("_id courseName courseCode");

        if (!courses.length)
            return res.status(200).json({
                success: true,
                assignments: []
            });

        const courseIDs = courses.map(c => c._id);

        const assignments = await Assignment.find({
            course: { $in: courseIDs }
        }).select("_id title course dueDate totalMarks");

        if (!assignments.length)
            return res.status(200).json({
                success: true,
                assignments: []
            });

        const assignmentsIDs = assignments.map(c => c._id);

        const pending = await Submission.aggregate([
            {
                $match: {
                    assignment: { $in: assignmentsIDs },
                    isGraded: false
                }
            },
            {
                $group: {
                    _id: "$assignment",
                    pendingGrading: { $sum: 1 }
                }
            }
        ]);

        const pendingMap = {};
        pending.forEach(p => {
            pendingMap[p._id.toString()] = p.pendingGrading;
        });

        const result = assignments.map(a => {
            const course = courses.find(
                c => c._id.toString() === a.course.toString()
            );

            return {
                title: a.title,
                courseName: course?.courseName,
                courseCode: course?.courseCode,
                dueDate: a?.dueDate,
                totalMarks: a?.totalMarks,
                pendingGrading: pendingMap[a._id.toString()] || 0
            };
        }).filter(a => a.pendingGrading > 0);

        return res.status(200).json({
            success: true,
            assignments: result
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

