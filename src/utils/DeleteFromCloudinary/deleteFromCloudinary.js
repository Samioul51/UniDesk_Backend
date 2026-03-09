import cloudinary from "../../config/cloudinary/cloudinary.js";

export const deleteFromCloudinary=async(id,resourceType="image")=>{
    try {
        if(!id)
            return;

        const types=["image","video","raw"];

        const type=types.includes(resourceType)?resourceType:"image";

        const result=await cloudinary.uploader.destroy(id,{
            resource_type:type
        });

        return result;
    } catch (error) {
        console.error("Cloudinary delete error:", error.message);
        return null;
    }
};