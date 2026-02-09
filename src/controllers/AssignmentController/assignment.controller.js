import { Assignment } from "../../models/AssignmentModel/assignment.model.js";
import { Course } from "../../models/CourseModel/course.model.js";
import { User } from "../../models/UserModel/user.model.js";

// Course wise assignments

export const courseAssignments = async (req, res) => {
    try {
        const id = req.params.id;

        const course = await Course.findById(id);

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
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
        const { title, description, dueDate, totalMarks, attachments, createdBy } = req.body;

        const user = await User.findById(createdBy);

        if (!user)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        if (!title || !description || !dueDate || !totalMarks || !createdBy)
            return res.status(400).json({
                success: false,
                message: "Title, Description, DueDate, Total marks and uploaderID required"
            });

        const isTeacher = course.teachers.some(
            t => t.toString() === createdBy.toString()
        );

        if (!isTeacher)
            return res.status(403).json({
                success: false,
                message: "You are not an instructor of this course"
            });

        const assignment={
            course:id,
            title,
            description,
            dueDate,
            totalMarks,
            createdBy
        };
        if(Array.isArray(attachments) && attachments.length>0)
            assignment.attachments=attachments;

        await Assignment.create(assignment);

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

export const getAssignment=async(req,res)=>{
    try {
        const {courseID,assignmentID}=req.params;

        const course=await Course.findById(courseID);

        if(!course)
            return res.status(404).json({
                success:false,
                message:"Course not found"
            });

        const assignment=await Assignment.findOne({
            _id:assignmentID,
            course:courseID
        });

        if(!assignment)
            return res.status(404).json({
                success:false,
                message:"Assignment for this course not found"
            });

        return res.status(200).json({
            success:true,
            assignment
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Assignment deletion

export const deleteAssignment=async(req,res)=>{
    try {
        const id=req.params.id;

        const assignment=await Assignment.findById(id);

        if(!assignment)
            return res.status(404).json({
                success:false,
                message:"Assignment not found"
            });
        
        await Assignment.deleteOne({_id:id});

        return res.status(200).json({
            success:true,
            message:"Assignment deleted successfully"
        });

   } catch (error) {
        res.status(500).json({message:error.message});      
    }
};