import { Announcement } from "../../models/AnnouncementModel/announcement.model.js";
import { Course } from "../../models/CourseModel/course.model.js";
import { User } from "../../models/UserModel/user.model.js";


export const createAnnouncement=async(req,res)=>{
    try {
        const {course,title,description,attachments,userID}=req.body;

        const user=await User.findById(userID);

        if(!user)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        
        if(user.role!=="faculty")
            return res.status(403).json({
                success: false,
                message: "Only faculty can create announcements"
            });
        
        if(!title || !description)
            return res.status(400).json({
                success: false,
                message: "Announcement Title and Description needed"
            });
        
        const courseExists=await Course.findById(course);

        if(!courseExists)
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });

        const announcement={
            course,
            title,
            description,
            teacher:user._id,
        };

        if(attachments)
            announcement.attachments=attachments;
        
        const result=await Announcement.create(announcement);

        return res.status(201).json({
            success: true,
            message:"Announcement created successfully"
        });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const updateAnnouncement=async (req,res)=>{
    try {
        const id=req.params.id;
        const {title,description,attachments,userID,addAttachments,removeAttachments}=req.body;

        const announcement=await Announcement.findById(id);

        if(!announcement)
            return res.status(404).json({
                success: false,
                message: "Announcement not found"
            });

        const user=await User.findById(userID);

        if(!user)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        if(announcement.teacher.toString()!== userID)
            return res.status(403).json({
                success: false,
                message: "You can only update your own announcements"
            });

        if(!title && !description && !addAttachments && !removeAttachments)
            return res.status(400).json({
                success: false,
                message: "Nothing to update"
            });

        const updatedFields={};

        if(title)
            updatedFields.title=title;

        if(description)
            updatedFields.description=description;

        if(Object.keys(updatedFields).length>0)
            await Announcement.updateOne(
                {_id:id},
                {$set:updatedFields}
            );

        if(addAttachments && addAttachments.length>0)
            await Announcement.updateOne(
                {_id:id},
                {$push:{attachments:{$each:addAttachments}}}
            );

        if(removeAttachments && removeAttachments.length>0)
            await Announcement.updateOne(
                {_id:id},
                {$pull:{attachments:{url:{$in:removeAttachments}}}}
            );

        return res.status(200).json({
            success:true,
            message:"Announcement updated successfully"
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};