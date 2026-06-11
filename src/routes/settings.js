const router = require('express').Router();
const { settings, updateSettings } = require('../controllers/contentController');
const { verifyToken } = require('../middleware/auth');
const { verifyAdmin } = require('../middleware/adminAuth');

router.get('/', settings);
router.put('/', verifyToken, verifyAdmin, updateSettings);

module.exports = router;
