import { notificationTypes } from "../../constants/notificationTypes.js";
import { Leaderboard } from "../../models/ContributionLeaderboardModel/leaderboard.model.js";
import { Repository } from "../../models/RepositoryModel/repository.model.js";
import { User } from "../../models/UserModel/user.model.js";
import { validateFileResourceType } from "../../utils/CloudinaryValidation/cloudinaryValidation.js";
import { deleteFromCloudinary } from "../../utils/DeleteFromCloudinary/deleteFromCloudinary.js";
import { notifyUsers } from "../../utils/NotificationEngine/notificationService.js";

// Item upload

export const itemUpload = async (req, res) => {
    try {
        const { title, courseCode, courseName, year, semester, itemType, url, description, cloudinaryId, resourceType, tags } = req.body;

        const uploader = req.dbUser._id;

        if (!title || !courseCode || !courseName || !year || !semester || !itemType || !url || !description || !cloudinaryId)
            return res.status(400).json({
                success: false,
                message: "All fields required"
            });

        if (!validateFileResourceType(resourceType))
            return res.status(400).json({
                success: false,
                message: "Invalid resource type"
            });

        const cleanedTags = Array.isArray(tags) ?
            tags.map(tag => String(tag).trim()).filter(Boolean)
            :
            [];

        if (cleanedTags.length === 0)
            return res.status(400).json({
                success: false,
                message: "At least one valid tag is required"
            });

        const item = await Repository.create({
            title,
            courseCode,
            courseName,
            year,
            semester,
            itemType,
            url,
            cloudinaryId,
            tags:cleanedTags,
            resourceType,
            uploader,
            description
        });

        const admins = await User.find({ role: "admin" }).select("_id");

        if (admins.length > 0) {
            try {
                await notifyUsers({
                    receivers: admins.map(a => a._id),
                    sender: uploader,
                    type: notificationTypes.contributionPending,
                    title: "New Contribution Pending",
                    message: "A new repository item needs review.",
                    entityModel: "Repository",
                    redirectURL: "/admin/repository"
                });
            } catch (error) {
                console.error(error.message);
            }
        }

        return res.status(201).json({
            success: true,
            message: "Item uploaded successfully and is pending approval",
            item
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get items

export const getItems = async (req, res) => {
    try {
        const { courseCode, year, semester, itemType, search, page = 1, limit = 9 } = req.query;

        const filter = {};

        if (courseCode)
            filter.courseCode = courseCode.toUpperCase();
        if (year)
            filter.year = year;
        if (semester)
            filter.semester = semester;
        if (itemType)
            filter.itemType = itemType;
        if (search)
            filter.title = { $regex: search, $options: "i" };

        if (!req.dbUser || req.dbUser.role !== "admin") {
            filter.$or = [
                {
                    status: "approved"
                },
                {
                    status: "pending",
                    uploader: req.dbUser?._id
                }
            ];
        }
        const skip = (page - 1) * limit;

        const items = await Repository.find(filter).populate("uploader", "name email photoURL").sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));

        const total = await Repository.countDocuments(filter);

        return res.status(200).json({
            success: true,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            items
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get single Item

export const getSingleItem = async (req, res) => {
    try {
        const id = req.params.id;

        const item = await Repository.findById(id).populate("uploader", "name email photoURL");

        if (!item)
            return res.status(404).json({
                success: false,
                message: "Item not found"
            });

        if (!req.dbUser || req.dbUser.role !== "admin") {
            if (item.status !== "approved")
                return res.status(403).json({
                    success: false,
                    message: "Item not available"
                });
        }

        return res.status(200).json({
            success: true,
            item
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Status update

export const itemStatusUpdate = async (req, res) => {
    try {
        const id = req.params.id;

        const admin = req.dbUser;

        const item = await Repository.findById(id);

        if (!item)
            return res.status(404).json({
                success: false,
                message: "Item not found"
            });

        const wasApproved = item.status === "approved";

        const { status, rejectedReason } = req.body;

        if (!status)
            return res.status(400).json({
                success: false,
                message: "Status is required"
            });

        if (admin.role !== "admin")
            return res.status(403).json({
                success: false,
                message: "Only admins can change status"
            });

        const allowedStatus = ["approved", "rejected"];

        if (!allowedStatus.includes(status))
            return res.status(400).json({
                success: false,
                message: "Invalid status value"
            });

        const updatedData = { status }

        if (status === "approved") {
            updatedData.approvedBy = admin._id;
            updatedData.approvedAt = new Date(),
                updatedData.rejectedReason = null;
        }

        if (status === "rejected") {
            if (!rejectedReason)
                return res.status(400).json({
                    success: false,
                    message: "Rejection reason is required"
                });

            updatedData.rejectedReason = rejectedReason;
        }

        await Repository.updateOne(
            { _id: id },
            { $set: updatedData }
        );

        if (status === "approved" && !wasApproved) {
            await Leaderboard.findOneAndUpdate(
                { user: item.uploader },
                {
                    $inc: {
                        totalPoints: 10,
                        itemsApproved: 1
                    }
                },
                { upsert: true, new: true }
            );
        }

        const updatedItem = await Repository.findById(id);

        if (status === "approved") {
            try {
                await notifyUsers({
                    receivers: [updatedItem.uploader],
                    sender: admin._id,
                    type: notificationTypes.contributionApproved,
                    title: "Contribution Approved",
                    message: "Your uploaded item has been approved.",
                    entityID: updatedItem._id,
                    entityModel: "Repository",
                    redirectURL: `/repository/${updatedItem._id}`
                });
            } catch (error) {
                console.error(error.message);
            }
        }

        if (status === "rejected") {
            try {
                await notifyUsers({
                    receivers: [updatedItem.uploader],
                    sender: admin._id,
                    type: notificationTypes.contributionRejected,
                    title: "Contribution Rejected",
                    message: "Your uploaded item was rejected.",
                    entityID: updatedItem._id,
                    entityModel: "Repository",
                    redirectURL: `/repository/${updatedItem._id}`
                });
            } catch (error) {
                console.error(error.message);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Item status updated successfully",
            item: updatedItem
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Leaderboard

export const getLeaderboard = async (req, res) => {
    try {
        const userID = req.dbUser?._id;

        const topUsers = await Leaderboard.find().populate("user", "name photoURL")
            .sort({ totalPoints: -1 }).limit(10);

        const rankedTopUsers = topUsers.map((entry, index) => ({
            rank: index + 1, ...entry.toObject()
        }));

        let currentUserData = null;
        if (userID) {
            const isInTop10 = rankedTopUsers.find(
                u => u.user._id.toString() === userID.toString()
            );

            if (isInTop10)
                currentUserData = isInTop10
            else {
                const currentUser = await Leaderboard.findOne({ user: userID });

                if (currentUser) {
                    const position = await Leaderboard.countDocuments({
                        totalPoints: { $gt: currentUser.totalPoints }
                    });
                    currentUserData = {
                        rank: position + 1, ...currentUser.toObject()
                    };
                }
            }
        }

        return res.status(200).json({
            success: true,
            top10: rankedTopUsers,
            currentUser: currentUserData
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Item Deletion

export const deleteItem = async (req, res) => {
    try {
        const id = req.params.id;

        const item = await Repository.findById(id);

        const user = req.dbUser;

        if (!item)
            return res.status(404).json({
                success: false,
                message: "Item not found"
            });

        if (user.role !== "admin" && (item.uploader.toString() !== user._id.toString()))
            return res.status(403).json({
                success: false,
                message: "You can delete only your items"
            });

        try {
            await deleteFromCloudinary(item.cloudinaryId, item.resourceType || "raw");
        } catch (error) {
            console.error("Cloudinary deletion failed:", error.message);
        }

        await item.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Item permanently deleted"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};