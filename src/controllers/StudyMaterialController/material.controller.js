import { Course } from "../../models/CourseModel/course.model.js";
import { Material } from "../../models/StudyMaterialModel/material.model.js";
import { User } from "../../models/UserModel/user.model.js";


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

        await Material.create({
            course: id,
            title,
            description,
            url,
            uploader: uploader
        });

        return res.status(201).json({
            success: true,
            message: "Material uploaded successfully"
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};