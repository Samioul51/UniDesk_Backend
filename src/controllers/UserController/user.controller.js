import { User } from "../../models/UserModel/user.model.js";

// User creation

export const createUser = async (req, res) => {
    try {
        const newUser = req.body;

        const existingUser = await User.findOne({ email: newUser.email });

        if (existingUser)
            return res.status(200).json(existingUser);

        const user = await User.create(newUser);

        return res.status(201).json({
            success:true,
            message:"User created successfully",
            user
        });
    }
    catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

// All users data

export const getUsers = async (req, res) => {
    try {
        const users = await User.find();
        return res.status(200).json(users);
    }
    catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

// Single user data

export const getSingleUser = async (req, res) => {
    try {
        const email = req.params.email;
        const user = await User.findOne({ email });

        if (!user)
            return res.status(400).json({
                success: false,
                message: "User not found"
            });

        return res.status(200).json(user);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

// Profile update api for user only

export const updateProfile = async (req, res) => {
    try {
        const email = req.params.email;
        const { name, photoURL,room } = req.body;

        if (!name && !photoURL && !room)
            return res.status(400).json({
                success: false,
                message: "At least one field is required to update profile"
            });

        const updatedFields = {};
        if (name)
            updatedFields.name = name;
        if (photoURL)
            updatedFields.photoURL = photoURL;
        if(room)
            updatedFields.room=room;

        const result = await User.updateOne(
            { email },
            {
                $set: updatedFields
            }
        );

        if (result.matchedCount === 0)
            return res.status(404).json({
                success: false,
                message: "No user found"
            });

        if(result.modifiedCount===0)
            return res.status(200).json({
                success: true,
                message: "No changes were made"
            });

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully"
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Profile update api for admin only

export const adminUpdateProfile=async(req,res)=>{
    try {
        const email=req.params.email;
        const {name,photoURL,status,room}=req.body;
        if (!name && !photoURL && !status && !room)
            return res.status(400).json({
                success: false,
                message: "At least one field is required to update profile"
            });

        const allowedStatus=["active","suspended"];

        const cleanStatus=typeof status==="string"?status.trim():null;

        if(cleanStatus && !allowedStatus.includes(cleanStatus))
            return res.status(400).json({
                success: false,
                message: "Invalid status value"
            });
        
        const updatedFields = {};
        if (name)
            updatedFields.name = name;
        if (photoURL)
            updatedFields.photoURL = photoURL;
        if(cleanStatus)
            updatedFields.status=cleanStatus;
        if(room)
            updatedFields.room=room;

        const result = await User.updateOne(
            { email },
            {
                $set: updatedFields
            }
        );

        if (result.matchedCount === 0)
            return res.status(404).json({
                success: false,
                message: "No user found"
            });

        if(result.modifiedCount===0)
            return res.status(200).json({
                success: true,
                message: "No changes were made"
            });

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully"
        });


    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// User delete api for admin only

export const adminDeleteUser=async(req,res)=>{
    try {
        const {email}=req.params;

        const user=await User.findOne({email});

        if(!user)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        if(user.role==="admin")
            return res.status(403).json({
                success: false,
                message: "Admin users cannot be deleted"
            });
        
        await User.deleteOne({email});

        return res.status(200).json({
            success:true,
            message:"User permanently deleted"
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};