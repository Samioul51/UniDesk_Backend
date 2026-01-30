import { User } from "../../models/UserModel/user.model.js";

// User creation

export const createUser=async(req,res)=>{
    try{
        const newUser=req.body;

        const existingUser=await User.findOne({email:newUser.email});

        if(existingUser)
            return res.status(200).json(existingUser);

        const user=await User.create(newUser);

        res.status(201).json(user);
    }
    catch(error){
        res.status(400).json({message:error.message});
    }
};

export const getUsers=async(req,res)=>{
    try{
        const users=await User.find();
        res.status(200).json(users);
    }
    catch(error){
        res.status(400).json({message:error.message});
    }
};