const router = require('express').Router();
const { streamUrl, uploadVideo, updateVideo, deleteVideo, createVideoEntry, markVideoActive, importFromBunny, confirmImport } = require('../controllers/videoController');
const { verifyToken } = require('../middleware/auth');
const { verifyAdmin } = require('../middleware/adminAuth');
const { videoUpload } = require('../middleware/upload');

router.get('/:id/stream-url', verifyToken, streamUrl);
router.post('/upload', verifyToken, verifyAdmin, videoUpload.single('video'), uploadVideo);
router.post('/create-entry', verifyToken, verifyAdmin, createVideoEntry);
router.put('/:id/activate', verifyToken, verifyAdmin, markVideoActive);
router.get('/bunny-library', verifyToken, verifyAdmin, importFromBunny);
router.post('/confirm-import', verifyToken, verifyAdmin, confirmImport);
router.put('/:id', verifyToken, verifyAdmin, updateVideo);
router.delete('/:id', verifyToken, verifyAdmin, deleteVideo);

module.exports = router;
