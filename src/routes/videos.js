const router = require('express').Router();
const { streamUrl, uploadVideo, updateVideo, deleteVideo } = require('../controllers/videoController');
const { verifyToken } = require('../middleware/auth');
const { verifyAdmin } = require('../middleware/adminAuth');
const { videoUpload } = require('../middleware/upload');

router.get('/:id/stream-url', verifyToken, streamUrl);
router.post('/upload', verifyToken, verifyAdmin, videoUpload.single('video'), uploadVideo);
router.put('/:id', verifyToken, verifyAdmin, updateVideo);
router.delete('/:id', verifyToken, verifyAdmin, deleteVideo);

module.exports = router;
