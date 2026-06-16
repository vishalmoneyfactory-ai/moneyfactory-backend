const router = require('express').Router();
const { settings, updateSettings, earnVideo } = require('../controllers/contentController');
const { verifyToken } = require('../middleware/auth');
const { verifyAdmin } = require('../middleware/adminAuth');

router.get('/', settings);
router.get('/earn-video', earnVideo);
router.put('/', verifyToken, verifyAdmin, updateSettings);

module.exports = router;
