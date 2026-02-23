import { User } from "../../models/UserModel/user.model.js";

// User creation

export const createUser = async (req, res) => {
    try {
        const { name, email, role, department, studentID, batch, designation, photoURL, photoId, room, method } = req.body;

        if (!email)
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            if (method === "google" && existingUser.status === "pending") {
                existingUser.status = "verified";
                await existingUser.save();
            }
            return res.status(200).json({
                success: true,
                message: "User already exists",
                existingUser
            });
        }

        if (!normalizedEmail.endsWith(".kuet.ac.bd"))
            return res.status(400).json({
                success: false,
                message: "Email is not valid KUET email"
            });

        let newUser = {

        };

        if (method === "email") {
            // Email signup
            if (role === "student") {
                if (!normalizedEmail.endsWith("@stud.kuet.ac.bd"))
                    return res.status(403).json({
                        success: false,
                        message: "Email is not valid student email"
                    });

                const userNameRegex = /^[a-zA-Z]+(\d{7})@stud\.kuet\.ac\.bd$/;

                if (!userNameRegex.test(normalizedEmail))
                    return res.status(403).json({
                        success: false,
                        message: "Email is not valid student email"
                    });

                const rollFromEmail = normalizedEmail.match(/(\d{7})@/)[1];

                if (rollFromEmail !== studentID)
                    return res.status(403).json({
                        success: false,
                        message: "StudentID in email not matched with given StudentID"
                    });

                if (!name || !role || !department || !studentID || !batch || !photoURL || !photoId)
                    return res.status(400).json({
                        success: false,
                        message: "All fields required"
                    });

                newUser = {
                    name,
                    email: normalizedEmail,
                    role,
                    department,
                    studentID,
                    batch,
                    photoURL,
                    photoId
                };
            }
            else if (role === "faculty") {
                const userNameRegex = /@.+\.kuet\.ac\.bd$/;

                if (!userNameRegex.test(normalizedEmail))
                    return res.status(403).json({
                        success: false,
                        message: "Email is not valid faculty email"
                    });

                const departments = ["mte", "che", "te", "le", "ese", "iem", "me", "mse", "bme", "ece", "eee", "cse", "hum", "chem", "phy", "math", "arch", "becm", "urp", "ce"];

                const dept = normalizedEmail.toLowerCase().match(/@([a-z]+)\.kuet\.ac\.bd$/)?.[1] || null;

                if (!departments.includes(dept))
                    return res.status(400).json({
                        success: false,
                        message: "Not valid department"
                    });

                if (department !== dept)
                    return res.status(403).json({
                        success: false,
                        message: "Department in email not matched with given department"
                    });

                if (!name || !role || !department || !designation || !photoURL || !photoId || !room)
                    return res.status(400).json({
                        success: false,
                        message: "All fields required"
                    });

                newUser = {
                    name,
                    email: normalizedEmail,
                    role,
                    department,
                    designation,
                    photoURL,
                    photoId,
                    room
                };
            }
            else
                return res.status(403).json({
                    success: false,
                    message: "Not valid role"
                });
        }
        else if (method === "google") {
            // Google method
            if (normalizedEmail.endsWith("@stud.kuet.ac.bd")) {
                const userNameRegex = /^[a-zA-Z]+(\d{7})@stud\.kuet\.ac\.bd$/;

                if (!userNameRegex.test(normalizedEmail))
                    return res.status(403).json({
                        success: false,
                        message: "Email is not valid student email"
                    });

                const roll = normalizedEmail.match(/(\d{7})@/)[1];

                const batchDigits = "2K" + roll.slice(0, 2);

                const deptCode = roll.slice(2, 4);

                const departments = {
                    "01": "ce",
                    "03": "eee",
                    "05": "me",
                    "07": "cse",
                    "09": "ece",
                    "11": "iem",
                    "13": "ese",
                    "15": "bme",
                    "17": "urp",
                    "19": "le",
                    "21": "te",
                    "23": "becm",
                    "25": "arch",
                    "27": "mse",
                    "29": "chem",
                    "31": "mte"
                };

                if (!(deptCode in departments))
                    return res.status(400).json({
                        success: false,
                        message: "Invalid department code"
                    });

                if (!name)
                    return res.status(400).json({
                        success: false,
                        message: "Student name required"
                    });
                newUser = {
                    name,
                    email: normalizedEmail,
                    role: "student",
                    department: departments[deptCode], studentID: roll,
                    batch: batchDigits,
                    photoURL,
                    photoId,
                    status: "verified"
                };
            }
            else {
                const userNameRegex = /@.+\.kuet\.ac\.bd$/;

                if (!userNameRegex.test(normalizedEmail))
                    return res.status(403).json({
                        success: false,
                        message: "Email is not valid faculty email"
                    });

                const facultyInfo = await mongoose.connection.db.collection("facultyInformations").findOne({ email: normalizedEmail });

                if (!facultyInfo)
                    return res.status(403).json({
                        success: false,
                        message: "This email is not listed as KUET faculty"
                    });

                const departments = ["mte", "che", "te", "le", "ese", "iem", "me", "mse", "bme", "ece", "eee", "cse", "hum", "chem", "phy", "math", "arch", "becm", "urp", "ce"];

                const dept = normalizedEmail.toLowerCase().match(/@([a-z]+)\.kuet\.ac\.bd$/)[1];

                if (!departments.includes(dept))
                    return res.status(400).json({
                        success: false,
                        message: "Not valid department"
                    });

                newUser = {
                    name,
                    email: normalizedEmail,
                    role: "faculty",
                    department: dept,
                    designation: facultyInfo.designation,
                    photoURL: photoURL || facultyInfo.image,
                    photoId,
                    room: "",
                    status: "verified"
                }
            }
        }
        else
            return res.status(404).json({
                success: false,
                message: "Invalid signup method"
            });

        const user = await User.create(newUser);

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            user
        });
    }
    catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// All users data

export const getUsers = async (req, res) => {
    try {
        const { search, role, status, department } = req.query;

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const query = {};

        if (search)
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];

        if (role)
            query.role = role;
        if (status)
            query.status = status;
        if (department)
            query.department = department;

        const users = await User.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .select("-__v");

        const totalUsers = await User.countDocuments(query);

        return res.status(200).json({
            success: true,
            page,
            totalPages: Math.ceil(totalUsers / limit),
            totalUsers,
            count: users.length,
            users
        });
    }
    catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Single user data

export const getSingleUser = async (req, res) => {
    try {
        const email = req.params.email?.trim().toLowerCase();
        const user = await User.findOne({ email }).select("-__v");

        if (!user)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        return res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Profile update api for user only

export const updateProfile = async (req, res) => {
    try {
        const email = req.params.email?.trim().toLowerCase();
        const { name, photoURL, room } = req.body;

        if (!name && !photoURL && !room)
            return res.status(400).json({
                success: false,
                message: "At least one field is required to update profile"
            });

        if (room && user.role !== "faculty")
            return res.status(403).json({
                success: false,
                message: "Only faculty can update room"
            });

        const updatedFields = {};
        if (name)
            updatedFields.name = name;
        if (photoURL)
            updatedFields.photoURL = photoURL;
        if (room)
            updatedFields.room = room;

        const user = await User.findOneAndUpdate(
            { email },
            {
                $set: updatedFields
            },
            { new: true }
        ).select("-__v");

        if (!user)
            return res.status(404).json({
                success: false,
                message: "No user found"
            });

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Profile update api for admin only

export const adminUpdateProfile = async (req, res) => {
    try {
        const email = req.params.email?.trim().toLowerCase();
        const { name, photoURL, status, room } = req.body;
        if (!name && !photoURL && !status && !room)
            return res.status(400).json({
                success: false,
                message: "At least one field is required to update profile"
            });

        const allowedStatus = ["verified", "suspended"];

        const cleanStatus = typeof status === "string" ? status.trim() : null;

        if (cleanStatus && !allowedStatus.includes(cleanStatus))
            return res.status(400).json({
                success: false,
                message: "Invalid status value"
            });

        const updatedFields = {};
        if (name)
            updatedFields.name = name;
        if (photoURL)
            updatedFields.photoURL = photoURL;
        if (cleanStatus)
            updatedFields.status = cleanStatus;
        if (room)
            updatedFields.room = room;

        const user = await User.findOneAndUpdate(
            { email },
            {
                $set: updatedFields
            },
            { new: true }
        ).select("-__v");

        if (!user)
            return res.status(404).json({
                success: false,
                message: "No user found"
            });

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user
        });


    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// User delete api for admin only

export const adminDeleteUser = async (req, res) => {
    try {
        const email = req.params.email?.trim().toLowerCase();

        const user = await User.findOne({ email });

        if (!user)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        if (user.role === "admin")
            return res.status(403).json({
                success: false,
                message: "Admin users cannot be deleted"
            });

        await User.deleteOne({ email });

        return res.status(200).json({
            success: true,
            message: "User permanently deleted"
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};