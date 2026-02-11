import { Leaderboard } from "../../models/ContributionLeaderboardModel/leaderboard.model.js";
import { Repository } from "../../models/RepositoryModel/repository.model.js";
import { User } from "../../models/UserModel/user.model.js";

// Item upload

export const itemUpload = async (req, res) => {
    try {
        const { title, courseCode, courseName, year, semester, itemType, url, uploader, description } = req.body;

        const user = await User.findById(uploader);

        if (!user)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        if (!title || !courseCode || !courseName || !year || !semester || !itemType || !url || !description)
            return res.status(400).json({
                success: false,
                message: "All fields required"
            });

        await Repository.create({
            title,
            courseCode,
            courseName,
            year,
            semester,
            itemType,
            url,
            uploader,
            description,
            status: "pending"
        });

        return res.status(201).json({
            success: true,
            message: "Item uploaded successfully and is pending approval"
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Get items

export const getItems = async (req, res) => {
    try {
        const { courseCode, year, semester, itemType, search, page = 1, limit = 10 } = req.query;

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

        const skip = (page - 1) * limit;

        const items = await Repository.find(filter).populate("uploader", "name").sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));

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
            message: error.message
        });
    }
};

// Get single Item

export const getSingleItem = async (req, res) => {
    try {
        const id = req.params.id;

        const item = await Repository.findById(id);

        if (!item)
            return res.status(404).json({
                success: false,
                message: "Item not found"
            });

        return res.status(200).json({
            success: true,
            item
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Status update

export const itemStatusUpdate = async (req, res) => {
    try {
        const id = req.params.id;

        const item = await Repository.findById(id);

        if (!item)
            return res.status(404).json({
                success: false,
                message: "Item not found"
            });

        const { status, rejectedReason, adminID } = req.body;

        if (!status)
            return res.status(400).json({
                success: false,
                message: "Status is required"
            });

        const user = await User.findById(adminID);

        if (!user)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        if (user.role !== "admin")
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
            updatedData.approvedBy = adminID;
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

        return res.status(200).json({
            success: true,
            message: "Item status updated successfully"
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Leaderboard

export const getLeaderboard = async (req, res) => {
    try {
        const userID = req.user?._id;

        const topUsers = await Leaderboard.find().populate("user", "name studentID")
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
            message: error.message
        });
    }
};