import 'dotenv/config'; // Modern way to load .env
import { v2 as cloudinary } from 'cloudinary'; // Modern way to load Cloudinary

// 1. Setup the "Magic Link"
cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL
});

// 2. The actual "Upload Anything" function
export async function uploadToCloudinary(filePath) {
    try {
        console.log("🚀 Starting upload to Cloudinary...");

        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: "auto",
            folder: "medrae_platform",
            use_filename: true,    // <--- Add this!
            unique_filename: false // <--- And this!
        });
        console.log("✅ SUCCESS!");
        console.log("Link to your file:", result.secure_url);
        return result.secure_url;
    } catch (error) {
        console.error("❌ OOPSIE:", error.message);
    }
}

// 3. TEST IT RIGHT NOW:
// (Make sure you have a file named 'test.pdf' or change this name)
uploadToCloudinary("./test.pdf");
