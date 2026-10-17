import multer from 'multer';

// Store uploaded files in memory as Buffers for direct streaming to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept standard image MIME types (JPEG, PNG, WebP, SVG, GIF)
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type: Only image files (JPEG, PNG, WebP, SVG) are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max per image file
  },
  fileFilter
});

export default upload;
