import { User } from "../../models/UserModel/user.model.js";

export const verifyRole = (roles) => async (req, res, next) => {
    try {
        const dbUser = await User.findOne({ email: req.user.email });

        if (!dbUser || !roles.includes(dbUser.role))
            return res.status(403).json({
                success: false,
                message: "Forbidden access"
            });

        req.dbUser=dbUser;
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Role verification failed"
        });
    }
};