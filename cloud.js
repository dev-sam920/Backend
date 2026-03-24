const multer = require("multer");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// Configure Cloudinary using CLOUDINARY_URL if available, else individual keys
if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ CLOUDINARY_URL: process.env.CLOUDINARY_URL });
} else if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
} else {
    throw new Error("Missing Cloudinary credentials. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env.");
}

const upload = multer({ storage: multer.memoryStorage() });

async function uploadToCloudinary(file) {
    if (!file) {
        throw new Error("No file provided for Cloudinary upload");
    }

    const base64Data = file.buffer.toString("base64");
    const dataUri = `data:${file.mimetype};base64,${base64Data}`;

    const result = await cloudinary.uploader.upload(dataUri, {
        folder: "receipt_keeper",
        resource_type: "image",
    });

    return {
        url: result.secure_url,
        public_id: result.public_id,
    };
}

module.exports = {
    upload,
    uploadToCloudinary,
};
