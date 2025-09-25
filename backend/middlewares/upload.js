// middleware/upload.js
const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    // allow images and PDFs
    const isImage = file.mimetype.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf';
    if (!isImage && !isPdf) {
      return cb(new Error('Only image or PDF files are allowed!'), false);
    }
    cb(null, true);
  }
});

module.exports = upload;
