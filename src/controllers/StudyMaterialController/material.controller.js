import { notificationTypes } from "../../constants/notificationTypes.js";
import { Course } from "../../models/CourseModel/course.model.js";
import { Material } from "../../models/StudyMaterialModel/material.model.js";
import { notifyUsers } from "../../utils/NotificationEngine/notificationService.js";

// Upload material

export const uploadMaterial = async (req, res) => {
    try {
        const id = req.params.id;
        const { title, description, url } = req.body;

        const faculty = req.dbUser;

        const course = await Course.findById(id);

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const isFaculty = course.teachers.some(t => t.toString() === faculty._id.toString());

        if (!isFaculty)
            return res.status(403).json({
                success: false,
                message: "You are not teaching this course"
            });

        if (!title || !description || !url)
            return res.status(400).json({
                success: false,
                message: "Title, Description and URL required"
            });

        const material = await Material.create({
            course: id,
            title,
            description,
            url,
            uploader: faculty._id
        });

        if (course.students && course.students.length > 0) {
            await notifyUsers({
                receivers: course.students,
                sender: faculty._id,
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

export const courseMaterials = async (req, res) => {
    try {
        const id = req.params.id;

        const user = req.dbUser;

        const course = await Course.findById(id);

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const isOwner = (course.teachers.some(t => t.toString() === user._id.toString())) || (course.students.some(s => s.toString() === user._id.toString()));

        if (!isOwner)
            return res.status(403).json({
                success: false,
                message: "You are not authorized to get this course materials"
            });

        const materials = await Material.find({ course: id });

        return res.status(200).json({
            success: true,
            materials
        })
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Material deletion

export const deleteMaterial = async (req, res) => {
    try {
        const id = req.params.id;

        const faculty=req.dbUser;

        const material = await Material.findById(id);

        if (!material)
            return res.status(404).json({
                success: false,
                message: "Material not found"
            });

        const course=await Course.findById(material.course);

        const isFaculty = course.teachers.some(t => t.toString() === faculty._id.toString());

        if (!isFaculty)
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this course material"
            });

        await Material.deleteOne({ _id: id });

        return res.status(200).json({
            success: true,
            message: "Material deleted successfully"
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};