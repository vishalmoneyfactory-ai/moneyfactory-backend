const router = require('express').Router();
const { updateProgress, courseProgress, allProgress } = require('../controllers/progressController');
const { verifyToken } = require('../middleware/auth');

router.post('/update', verifyToken, updateProgress);
router.get('/course/:courseId', verifyToken, courseProgress);
router.get('/all', verifyToken, allProgress);

module.exports = router;
