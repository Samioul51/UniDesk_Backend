import { notificationTypes } from "../../constants/notificationTypes.js";
import { Announcement } from "../../models/AnnouncementModel/announcement.model.js";
import { Course } from "../../models/CourseModel/course.model.js";
import { User } from "../../models/UserModel/user.model.js";
import { notifyUsers } from "../../utils/NotificationEngine/notificationService.js";

// Announcement creation

export const createAnnouncement = async (req, res) => {
    try {
        const { course, title, description, attachments, userID } = req.body;

        const user = await User.findById(userID);

        if (!user)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        if (user.role !== "faculty")
            return res.status(403).json({
                success: false,
                message: "Only faculty can create announcements"
            });

        if (!title || !description)
            return res.status(400).json({
                success: false,
                message: "Announcement Title and Description needed"
            });

        const courseExists = await Course.findById(course);

        if (!courseExists)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const announcement = {
            course,
            title,
            description,
            teacher: user._id,
        };

        if (attachments)
            announcement.attachments = attachments;

        const result = await Announcement.create(announcement);

        const courseData = await Course.findById(course).select("students");

        if (courseData && courseData.students.length > 0) {
            await notifyUsers({
                receivers: courseData.students,
                sender: userID,
                type: notificationTypes.newAnnouncement,
                title: "New Announcement",
                message: `${title}`,
                entityID: result._id,
                entityModel: "Announcement",
                redirectURL: `/announcements/${result._id}`
            });
        }

        return res.status(201).json({
            success: true,
            message: "Announcement created successfully"
        });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Announcement update 

export const updateAnnouncement = async (req, res) => {
    try {
        const id = req.params.id;
        const { title, description, userID, addAttachments, removeAttachments } = req.body;

        const announcement = await Announcement.findById(id);

        if (!announcement)
            return res.status(404).json({
                success: false,
                message: "Announcement not found"
            });

        const user = await User.findById(userID);

        if (!user)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        if (announcement.teacher.toString() !== userID)
            return res.status(403).json({
                success: false,
                message: "You can only update your own announcements"
            });

        const hasTitle = typeof title === "string" && title.trim() !== "" && title !== announcement.title;
        const hasDescription = typeof description === "string" && description.trim() !== "" && description !== announcement.description;
        const hasAdd = Array.isArray(addAttachments) && addAttachments.length > 0;
        const hasRemove = Array.isArray(removeAttachments) && removeAttachments.length > 0;

        if (!hasTitle && !hasDescription && !hasAdd && !hasRemove)
            return res.status(400).json({
                success: false,
                message: "Nothing to update"
            });

        const updatedFields = {};

        if (title)
            updatedFields.title = title.trim();

        if (description)
            updatedFields.description = description.trim();

        if (Object.keys(updatedFields).length > 0)
            await Announcement.updateOne(
                { _id: id },
                { $set: updatedFields }
            );

        if (addAttachments && addAttachments.length > 0)
            await Announcement.updateOne(
                { _id: id },
                { $push: { attachments: { $each: addAttachments } } }
            );

        if (removeAttachments && removeAttachments.length > 0)
            await Announcement.updateOne(
                { _id: id },
                { $pull: { attachments: { url: { $in: removeAttachments } } } }
            );

        // 🔔 notify course students about update
        const courseData = await Course.findById(announcement.course).select("students");

        if (courseData && courseData.students.length > 0) {
            await notifyUsers({
                receivers: courseData.students,
                sender: userID,
                type: notificationTypes.announcementUpdate, // you can add announcementUpdated later if you want
                title: "Announcement Updated",
                message: `${announcement.title} has been updated.`,
                entityID: announcement._id,
                entityModel: "Announcement",
                redirectURL: `/announcements/${announcement._id}`
            });
        }

        return res.status(200).json({
            success: true,
            message: "Announcement updated successfully"
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Coursewise announcements

export const getCourseAnnouncements = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await Course.findById(id);

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        // const user=await User.findById(userID);

        // if(!user)
        //     return res.status(404).json({
        //         success: false,
        //         message: "User not found"
        //     });

        // const isTeacher=course.teachers.some(t=>t.toString()===user._id.toString());
        // const isStudent=course.students.some(s=>s.toString()===user._id.toString());

        // if(!isStudent && !isTeacher)
        //     return res.status(403).json({
        //         success: false,
        //         message: "You are not involved in this course"
        //     });

        const announcements = await Announcement.find({
            course: id
        })
            .populate("teacher", "name")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: announcements.length,
            announcements
        });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Announcement deletion

export const deleteAnnouncement = async (req, res) => {
    try {
        const id = req.params.id;

        const announcement = await Announcement.findById(id);

        if (!announcement)
            return res.status(404).json({
                success: false,
                message: "Announcement not found"
            });

        await Announcement.deleteOne(
            { _id: id }
        );

        return res.status(200).json({
            success: true,
            message: "Announcement deleted successfully"
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
