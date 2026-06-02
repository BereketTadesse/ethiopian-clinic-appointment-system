import multer from 'multer';

// Configure multer storage (you can customize this as needed)
const storage = multer.memoryStorage(); // Store files in memory 

const fileFilter = (req, file, cb) => {
  // Accept only image files (you can customize this as needed)
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed.'), false);
  }
};

const upload = multer({ storage, 
    limits: {fileSize: 3* 1024 * 1024 }, // Limit file size to 5MB
    fileFilter });

export default upload;