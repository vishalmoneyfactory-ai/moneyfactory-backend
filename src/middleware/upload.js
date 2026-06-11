const multer = require('multer');

const memoryStorage = multer.memoryStorage();

const imageUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    return cb(null, true);
  },
});

const videoUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) return cb(new Error('Only video files are allowed'));
    return cb(null, true);
  },
});

module.exports = { imageUpload, videoUpload };
