import cloudinary from "../../config/cloudinary/cloudinary.js";

export const deleteFromCloudinary=async(id)=>{
    try {
        if(!id)
            return;

        const result=await cloudinary.uploader.destroy(id);

        return result;
    } catch (error) {
        throw new Error("Failed to delete content from Cloudinary");
    }
};