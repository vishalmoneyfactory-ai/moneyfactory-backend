const router = require('express').Router();
const { uploadMedia, getMedia } = require('../controllers/contentController');
const { verifyToken } = require('../middleware/auth');
const { verifyAdmin } = require('../middleware/adminAuth');
const { imageUpload } = require('../middleware/upload');

router.get('/:id', getMedia);
router.post('/', verifyToken, verifyAdmin, imageUpload.single('image'), uploadMedia);

module.exports = router;
