import { notificationTypes } from "../../constants/notificationTypes.js";
import { Course } from "../../models/CourseModel/course.model.js";
import { Material } from "../../models/StudyMaterialModel/material.model.js";
import { User } from "../../models/UserModel/user.model.js";
import { notifyUsers } from "../../utils/NotificationEngine/notificationService.js";

// Upload material

export const uploadMaterial = async (req, res) => {
    try {
        const id=req.params.id;
        const { title, description, url, uploader } = req.body;

        const course = await Course.findById(id);

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const user = await User.findById(uploader);

        if (!user)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        if (!title || !description || !url)
            return res.status(400).json({
                success: false,
                message: "Title, Description and URL required"
            });

        const isTeacher = course.teachers.some(
            t => t.toString() === uploader.toString()
        );

        if (!isTeacher)
            return res.status(403).json({
                success: false,
                message: "You are not an instructor of this course"
            });

        const material=await Material.create({
            course: id,
            title,
            description,
            url,
            uploader: uploader
        });

        if (course.students && course.students.length > 0) {
            await notifyUsers({
                receivers: course.students,
                sender: uploader,
                type: notificationTypes.newStudyMaterial,
                title: "New Study Material",
                message: `${title} has been uploaded.`,
                entityID: material._id,
                entityModel: "Material",
                redirectURL: `/materials/${material._id}`
            });
        }

        return res.status(201).json({
            success: true,
            message: "Material uploaded successfully"
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Course wise materials

export const courseMaterials=async(req,res)=>{
    try {
        const id=req.params.id;
        
        const course=await Course.findById(id);

        if(!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        
        const materials=await Material.find({course:id})

        return res.status(200).json({
            success:true,
            materials
        })
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Material deletion

export const deleteMaterial=async(req,res)=>{
    try {
        const id=req.params.id;

        const material=await Material.findById(id);

        if(!material)
            return res.status(404).json({
                success:false,
                message:"Material not found"
            });
        
        await Material.deleteOne({_id:id});

        return res.status(200).json({
            success:true,
            message:"Material deleted successfully"
        });

   } catch (error) {
        res.status(500).json({message:error.message});      
    }
};