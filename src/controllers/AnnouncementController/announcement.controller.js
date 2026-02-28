import { notificationTypes } from "../../constants/notificationTypes.js";
import { Announcement } from "../../models/AnnouncementModel/announcement.model.js";
import { Course } from "../../models/CourseModel/course.model.js";
import { User } from "../../models/UserModel/user.model.js";
import { notifyUsers } from "../../utils/NotificationEngine/notificationService.js";

// Announcement creation

export const createAnnouncement = async (req, res) => {
    try {
        const course = req.params.id;
        const { title, description, attachments } = req.body;

        const courseExists = await Course.findById(course).select("teachers students");

        if (!courseExists)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        if (req.dbUser.role !== "faculty")
            return res.status(403).json({
                success: false,
                message: "Only faculty can create announcements"
            });

        const isFaculty = courseExists.teachers.some(
            t => t.toString() === req.dbUser._id.toString()
        );

        if (!isFaculty)
            return res.status(403).json({
                success: false,
                message: "You are not a teacher of this course"
            });

        if (!title || !description)
            return res.status(400).json({
                success: false,
                message: "Announcement Title and Description needed"
            });

        const announcement = {
            course,
            title,
            description,
            teacher: req.dbUser._id,
        };

        if (attachments)
            announcement.attachments = attachments;

        const result = await Announcement.create(announcement);

        if (courseExists.students.length > 0) {
            await notifyUsers({
                receivers: courseExists.students,
                sender: req.dbUser._id,
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
        const { courseID, announcementID } = req.params;
        const { title, description, addAttachments, removeAttachments } = req.body;

        const announcement = await Announcement.findById(announcementID);

        if (!announcement)
            return res.status(404).json({
                success: false,
                message: "Announcement not found"
            });

        if (announcement.teacher.toString() !== req.dbUser._id.toString())
            return res.status(403).json({
                success: false,
                message: "You can only update your own announcements"
            });

        const course = await Course.findById(courseID).select("teachers students");

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const isStillFaculty = course.teachers.some(
            t => t.toString() === req.dbUser._id.toString()
        );

        if (!isStillFaculty)
            return res.status(403).json({
                success: false,
                message: "You are no longer a teacher of this course"
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
                { _id: announcementID },
                { $set: updatedFields }
            );

        if (addAttachments && addAttachments.length > 0)
            await Announcement.updateOne(
                { _id: announcementID },
                { $push: { attachments: { $each: addAttachments } } }
            );

        if (removeAttachments && removeAttachments.length > 0)
            await Announcement.updateOne(
                { _id: announcementID },
                { $pull: { attachments: { url: { $in: removeAttachments } } } }
            );

        const updatedAnnouncement = await Announcement
            .findById(announcementID)
            .select("title");

        if (course.students.length > 0) {
            await notifyUsers({
                receivers: course.students,
                sender: req.dbUser._id,
                type: notificationTypes.announcementUpdate,
                title: "Announcement Updated",
                message: `${updatedAnnouncement.title} has been updated.`,
                entityID: announcementID,
                entityModel: "Announcement",
                redirectURL: `/announcements/${announcementID}`
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

        const isFaculty = course.teachers.some(t => t.toString() === req.dbUser._id.toString());
        const isStudent = course.students.some(s => s.toString() === req.dbUser._id.toString());

        if (!isStudent && !isFaculty)
            return res.status(403).json({
                success: false,
                message: "You are not involved in this course"
            });

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

        if (announcement.teacher.toString() !== req.dbUser._id.toString())
            return res.status(403).json({
                success: false,
                message: "You have not created this announcement so cannot delete"
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
