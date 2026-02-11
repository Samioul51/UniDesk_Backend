import { Repository } from "../../models/RepositoryModel/repository.model.js";
import { User } from "../../models/UserModel/user.model.js";

// Item upload

export const itemUpload=async(req,res)=>{
    try {
        const {title,courseCode,courseName,year,semester,itemType,url,uploader,description}=req.body;
        
        const user=await User.findById(uploader);

        if(!user)
            return res.status(404).json({
                success:false,
                message:"User not found"
            });
        
        if(!title || !courseCode || !courseName || !year || !semester || !itemType || !url || !description)
            return res.status(400).json({
                success:false,
                message:"All fields required"
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
            status:"pending"
        });

        return res.status(201).json({
                success:true,
                message:"Item uploaded successfully and is pending approval"
            });
    } catch (error) {
        return res.status(500).json({
                message:error.message
            });
    }
};

// Get items

export const getItem=async (req,res)=>{
    try {
        const {courseCode,year,semester,itemType,search,page=1,limit=10}=req.query;
        
        const filter={};

        if(courseCode)
            filter.courseCode=courseCode.toUpperCase();
        if(year)
            filter.year=year;
        if(semester)
            filter.semester=semester;
        if(itemType)
            filter.itemType=itemType;
        if(search)
            filter.title={$regex:search,$options:"i"};

        const skip=(page-1)*limit;

        const items=(await Repository.find(filter).populate("uploader","name")).sort({createdAt:-1}).skip(skip).limit(parseInt(limit));

        const total=await Repository.countDocuments(filter);

        return res.status(200).json({
            success:true,
            total,
            page:parseInt(page),
            totalPages:Math.ceil(total/limit),
            items
        })
    } catch (error) {
        return res.status(500).json({
            message:error.message
        })
    }
};