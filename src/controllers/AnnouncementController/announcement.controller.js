import { notificationTypes } from "../../constants/notificationTypes.js";
import { Announcement } from "../../models/AnnouncementModel/announcement.model.js";
import { Course } from "../../models/CourseModel/course.model.js";
import { validateAttachments } from "../../utils/CloudinaryValidation/cloudinaryValidation.js";
import { deleteFromCloudinary } from "../../utils/DeleteFromCloudinary/deleteFromCloudinary.js";
import { notifyUsers } from "../../utils/NotificationEngine/notificationService.js";

// Announcement creation

export const createAnnouncement = async (req, res) => {
    try {
        const course = req.params.id;
        const user = req.dbUser;
        const { title, description, attachments } = req.body;

        const courseExists = await Course.findById(course).select("faculties students");

        if (!courseExists)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        if (user.role !== "faculty")
            return res.status(403).json({
                success: false,
                message: "Only faculty can create announcements"
            });

        const isFaculty = courseExists.faculties.some(
            t => t.toString() === user._id.toString()
        );

        if (!isFaculty)
            return res.status(403).json({
                success: false,
                message: "You are not a faculty of this course"
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
            faculty: user._id,
        };

        if (attachments !== undefined) {
            if (!Array.isArray(attachments) || !validateAttachments(attachments)) {
                return res.status(400).json({
                    success: false,
                    message: "Each attachment needs url, cloudinaryId and valid resourceType"
                });
            }
            announcement.attachments = attachments;
        }

        const result = await Announcement.create(announcement);

        if (courseExists.students.length > 0) {
            try {
                await notifyUsers({
                    receivers: courseExists.students,
                    sender: user._id,
                    type: notificationTypes.newAnnouncement,
                    title: "New Announcement",
                    message: `${title}`,
                    entityID: result._id,
                    entityModel: "Announcement",
                    redirectURL: `/announcements/${result._id}`
                });
            } catch (error) {
                console.error(error.message);
            }
        }

        return res.status(201).json({
            success: true,
            message: "Announcement created successfully",
            announcement: result
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Announcement update 

export const updateAnnouncement = async (req, res) => {
    try {
        const { courseID, announcementID } = req.params;
        const user = req.dbUser;
        const { title, description, addAttachments, removeAttachments } = req.body;

        if (addAttachments !== undefined) {
            if (!Array.isArray(addAttachments) || !validateAttachments(addAttachments)) {
                return res.status(400).json({
                    success: false,
                    message: "Each new attachment needs url, cloudinaryId and valid resourceType"
                });
            }
        }

        const announcement = await Announcement.findById(announcementID);

        if (!announcement)
            return res.status(404).json({
                success: false,
                message: "Announcement not found"
            });

        if (announcement.course.toString() !== courseID)
            return res.status(400).json({
                success: false,
                message: "Announcement does not belong to this course"
            });

        if (announcement.faculty.toString() !== user._id.toString())
            return res.status(403).json({
                success: false,
                message: "You can only update your own announcements"
            });

        const course = await Course.findById(courseID).select("faculties students");

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const isStillFaculty = course.faculties.some(
            t => t.toString() === user._id.toString()
        );

        if (!isStillFaculty)
            return res.status(403).json({
                success: false,
                message: "You are no longer a faculty of this course"
            });

        const cleanTitle = typeof title === "string" ? title.trim() : null;
        const cleanDescription = typeof description === "string" ? description.trim() : null;

        const hasTitle = cleanTitle && cleanTitle !== announcement.title;
        const hasDescription = cleanDescription && cleanDescription !== announcement.description;
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
            if (hasTitle) updateQuery.$set.title = cleanTitle;
            if (hasDescription) updateQuery.$set.description = cleanDescription;
        }

        if (hasAdd)
            updateQuery.$push = {
                attachments: { $each: addAttachments }
            };

        if (hasRemove)
            updateQuery.$pull = {
                attachments: { url: { $in: removeAttachments } }
            };

        await Announcement.updateOne({ _id: announcementID }, updateQuery);

        if (hasRemove) {
            const removedFiles = announcement.attachments.filter(
                file => removeAttachments.includes(file.url)
            );

            await Promise.all(
                removedFiles.filter(file => file.cloudinaryId).map(file => deleteFromCloudinary(file.cloudinaryId, file.resourceType || "raw").catch((error) => {
                    console.error("Cloudinary deletion failed:", error.message)
                }))
            )
        }

        const updatedAnnouncement = await Announcement.findById(announcementID).select("title");

        if (course.students?.length > 0) {
            try {
                await notifyUsers({
                    receivers: course.students,
                    sender: user._id,
                    type: notificationTypes.announcementUpdate,
                    title: "Announcement Updated",
                    message: `${updatedAnnouncement.title} has been updated.`,
                    entityID: announcementID,
                    entityModel: "Announcement",
                    redirectURL: `/announcements/${announcementID}`
                });
            } catch (error) {
                console.error(error.message);
            }

        }

        return res.status(200).json({
            success: true,
            message: "Announcement updated successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Coursewise announcements

export const getCourseAnnouncements = async (req, res) => {
    try {
        const { id } = req.params;

        const user = req.dbUser;

        const course = await Course.findById(id);

        if (!course)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const isFaculty = course.faculties.some(t => t.toString() === user._id.toString());
        const isStudent = course.students.some(s => s.toString() === user._id.toString());

        if (!isStudent && !isFaculty)
            return res.status(403).json({
                success: false,
                message: "You are not involved in this course"
            });

        const announcements = await Announcement.find({
            course: id
        })
            .populate("faculty", "name")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: announcements.length,
            announcements
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Announcement deletion

export const deleteAnnouncement = async (req, res) => {
    try {
        const id = req.params.id;

        const user = req.dbUser;

        const announcement = await Announcement.findById(id);

        if (!announcement)
            return res.status(404).json({
                success: false,
                message: "Announcement not found"
            });

        if (announcement.faculty.toString() !== user._id.toString())
            return res.status(403).json({
                success: false,
                message: "You have not created this announcement so cannot delete"
            });

        if (announcement.attachments?.length) {
            await Promise.all(
                announcement.attachments
                    .filter(file => file.cloudinaryId)
                    .map(file =>
                        deleteFromCloudinary(file.cloudinaryId, file.resourceType || "raw")
                            .catch(error =>
                                console.error("Cloudinary deletion failed:", error.message)
                            )
                    )
            );
        }

        await announcement.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Announcement deleted successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
