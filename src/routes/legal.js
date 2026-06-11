const router = require('express').Router();
const { listLegal, updateLegal } = require('../controllers/contentController');
const { verifyToken } = require('../middleware/auth');
const { verifyAdmin } = require('../middleware/adminAuth');

router.get('/', listLegal);
router.put('/:slug', verifyToken, verifyAdmin, updateLegal);

module.exports = router;
