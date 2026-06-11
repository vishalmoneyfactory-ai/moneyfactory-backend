const router = require('express').Router();
const { listBanners, createBanner, updateBanner, deleteBanner } = require('../controllers/contentController');
const { verifyToken } = require('../middleware/auth');
const { verifyAdmin } = require('../middleware/adminAuth');

router.get('/', listBanners);
router.post('/', verifyToken, verifyAdmin, createBanner);
router.put('/:id', verifyToken, verifyAdmin, updateBanner);
router.delete('/:id', verifyToken, verifyAdmin, deleteBanner);

module.exports = router;
