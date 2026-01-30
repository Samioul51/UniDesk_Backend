import { User } from "../../models/UserModel/user.model.js";

// User creation

export const createUser = async (req, res) => {
    try {
        const newUser = req.body;

        const existingUser = await User.findOne({ email: newUser.email });

        if (existingUser)
            return res.status(200).json(existingUser);

        const user = await User.create(newUser);

        return res.status(201).json(user);
    }
    catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

export const getUsers = async (req, res) => {
    try {
        const users = await User.find();
        return res.status(200).json(users);
    }
    catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

export const getSingleUser = async (req, res) => {
    try {
        const email = req.params.email;
        const user = await User.findOne({ email });

        if (!user){
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        return res.status(200).json(user);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};