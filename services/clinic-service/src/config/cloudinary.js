import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Uploads an in-memory multer file buffer directly to Cloudinary CDN
 * @param {Object} file - Multer file object ({ buffer, mimetype })
 * @param {string} folder - Destination folder on Cloudinary
 * @returns {Promise<string>} The secure HTTPS asset URL
 */
export const uploadToCloudinary = async (file, folder = 'ethio_clinic_media') => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials are not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }

  // Convert buffer to data URI string
  const base64File = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

  const uploadResponse = await cloudinary.uploader.upload(base64File, {
    folder,
    resource_type: 'image'
  });

  return uploadResponse.secure_url;
};

export default cloudinary;
