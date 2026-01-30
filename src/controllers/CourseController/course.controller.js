import {Course} from "../../models/CourseModel/course.model.js";
import { generateInvitationCode } from "../../utils/InvitationCode/generateInvitationCode.js";

// Course Creation

export const createCourse=async (req,res)=>{
    try {
        const {courseCode,courseName,description,session,year,semester,department}=req.body;
    
        // Mock req.user(will remove it after integrating middleware)
        req.user = {
            _id: "64f123abc456def789012345",
            role: "faculty",
            email: "teacher@test.com"
        };

        if(req.user.role!=="faculty")
            return res.status(403).json({
                success:false,
                message:"Only faculty can create courses"
            });

        const invitationCode=generateInvitationCode();

        const course=await Course.create({
            courseCode,
            courseName,
            description,
            session,
            year,
            semester,
            department,
            teachers:[req.user._id],
            invitationCode
        });

        return res.status(201).json({
            success:true,
            course,
            invitationLink:`${process.env.LIVE_LINK}/join-course?code=${invitationCode}`
        });
    
    } catch (error) {
        if(error.code===11000)
            return res.status(409).json({
                message:"Course already exists for this session"
            });
        return res.status(500).json({message:error.message});
    }
}