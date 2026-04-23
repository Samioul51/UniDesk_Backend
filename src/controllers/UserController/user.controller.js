import { User } from "../../models/UserModel/user.model.js";
import mongoose from "mongoose";
import { deleteFromCloudinary } from "../../utils/DeleteFromCloudinary/deleteFromCloudinary.js";
import { auth } from "../../utils/Firebase/firebase.js"

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

        if (req.user.email !== normalizedEmail)
            return res.status(403).json({
                success: false,
                message: "Email mismatch with authenticated user"
            });

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

                if (roll !== studentID)
                    return res.status(403).json({
                        success: false,
                        message: "Student ID in email not matched with given Student ID"
                    });

                if (departments[deptCode] !== department)
                    return res.status(403).json({
                        success: false,
                        message: "Department in Student ID not matched with given department"
                    });

                if (batch !== batchDigits)
                    return res.status(403).json({
                        success: false,
                        message: "Batch in Student ID not matched with given batch"
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
            if (!normalizedEmail.endsWith(".kuet.ac.bd"))
                return res.status(403).json({
                    success: false,
                    message: "Please use a valid KUET email"
                });

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
                    photoId: null,
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
                    photoId: null,
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
            success: false,
            message: error.message
        });
    }
};

// All users data

export const getUsers = async (req, res) => {
    try {
        const { search, role, status, department } = req.query;

        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.min(Number(req.query.limit) || 10, 50);

        const query = {};

        if (search) {
            const searchRegex = new RegExp(search, "i");
            query.$or = [
                { name: searchRegex },
                { email: searchRegex }
            ];
        }

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
            success: false,
            message: error.message
        });
    }
};

// Single user data

export const getSingleUser = async (req, res) => {
    try {
        const email = req.params.email?.trim().toLowerCase();

        if (req.dbUser.role !== "admin" && req.user.email !== email)
            return res.status(403).json({
                success: false,
                message: "You can access only your own profile"
            });

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
            success: false,
            message: error.message
        });
    }
};

// Profile update api for user only

export const updateProfile = async (req, res) => {
    try {
        const email = req.params.email?.trim().toLowerCase();
        const { name, photoURL, photoId, room, biography, researchInterests, phone } = req.body;

        if (req.user.email !== email)
            return res.status(403).json({
                success: false,
                message: "You can update only your own profile"
            });

        if (!name && !photoURL && !photoId && !room && !biography && !researchInterests && !phone)
            return res.status(400).json({
                success: false,
                message: "At least one field is required to update profile"
            });

        if ((room || biography || researchInterests || phone) && req.dbUser.role !== "faculty")
            return res.status(403).json({
                success: false,
                message: "Only faculty can update room, biography, phone number and research interests"
            });

        if ((photoURL && !photoId) || (photoId && !photoURL))
            return res.status(400).json({
                success: false,
                message: "Both PhotoURL and PhotoId required"
            });

        const user = await User.findOne({ email });

        if (!user)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        if (name)
            user.name = name;

        if (room)
            user.room = room;

        if (biography)
            user.biography = biography;

        if (researchInterests)
            user.researchInterests = researchInterests;

        if (phone)
            user.phone = phone

        if (photoURL && photoId) {
            if (user.photoId && user.photoId !== photoId) {
                try {
                    await deleteFromCloudinary(user.photoId);
                } catch (error) {
                    console.error("Cloudinary deletion failed:", error.message);
                }
            }

            user.photoURL = photoURL;
            user.photoId = photoId;
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Profile update api for admin only

export const adminUpdateProfile = async (req, res) => {
    try {
        const email = req.params.email?.trim().toLowerCase();

        if (!email)
            return res.status(400).json({
                success: false,
                message: "User email is required"
            });

        const user = await User.findOne({ email: email });

        if (!user)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        const { name, photoURL, photoId, status, room, biography, researchInterests, phone } = req.body;

        if (!name && !photoURL && !photoId && !status && !room && !biography && !researchInterests && !phone)
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

        if ((room || biography || researchInterests || phone) && user.role !== "faculty")
            return res.status(403).json({
                success: false,
                message: "Only faculty can update room, biography, phone number and research interests"
            });

        if ((photoURL && !photoId) || (photoId && !photoURL))
            return res.status(400).json({
                success: false,
                message: "Both PhotoURL and PhotoId required"
            });

        if (name)
            user.name = name;

        if (room)
            user.room = room;

        if (biography)
            user.biography = biography;

        if (researchInterests)
            user.researchInterests = researchInterests;

        if (phone)
            user.phone = phone;

        if (cleanStatus)
            user.status = cleanStatus;

        if (photoURL && photoId) {
            if (user.photoId && user.photoId !== photoId) {
                try {
                    await deleteFromCloudinary(user.photoId);
                } catch (error) {
                    console.error("Cloudinary deletion failed:", error.message);
                }
            }

            user.photoURL = photoURL;
            user.photoId = photoId;
        }

        await user.save();

        const updatedUser = user.toObject({ versionKey: false });

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
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

        try {
            const firebaseUser = await auth.getUserByEmail(email);

            await auth.deleteUser(firebaseUser.uid);
        } catch (error) {
            if (error.code !== "auth/user-not-found")
                return res.status(500).json({
                    success: false,
                    message: "Failed to delete user"
                });
        }

        if (user.photoId) {
            try {
                await deleteFromCloudinary(user.photoId);
            } catch (error) {
                console.error("Cloudinary deletion failed:", error.message);
            }
        }

        await user.deleteOne();

        return res.status(200).json({
            success: true,
            message: "User permanently deleted"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get user by id for public access

export const getUserByID = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("name email photoURL role department");

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
            success: false,
            message: error.message
        });
    }
};

// Get current user's account status

export const getAccountStatus = async (req, res) => {
    try {
        const email = req.user.email;

        const user = await User.findOne({ email });

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
            success: false,
            message: error.message
        });
    }
};

// Complete email verification for pending user

export const verifyPendingAccount = async (req, res) => {
    try {
        const email = req.user.email;

        const dbUser = await User.findOne({ email });

        if (!dbUser)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        if (dbUser.status === "suspended")
            return res.status(403).json({
                success: false,
                message: "Your account is suspended"
            });

        if (dbUser.status === "verified")
            return res.status(200).json({
                success: true,
                message: "Account already verified"
            });

        const firebaseUser = await auth.getUser(req.user.uid);

        if (!firebaseUser.emailVerified)
            return res.status(400).json({
                success: false,
                message: "Email is not verified yet"
            });

        dbUser.status = "verified";
        await dbUser.save();

        return res.status(200).json({
            success: true,
            message: "Account verified successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};