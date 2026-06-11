const router = require('express').Router();
const { validateCoupon, createCoupon, listCoupons, updateCoupon, deleteCoupon } = require('../controllers/couponController');
const { verifyToken } = require('../middleware/auth');
const { verifyAdmin } = require('../middleware/adminAuth');

router.post('/validate', verifyToken, validateCoupon);
router.post('/', verifyToken, verifyAdmin, createCoupon);
router.get('/', verifyToken, verifyAdmin, listCoupons);
router.put('/:id', verifyToken, verifyAdmin, updateCoupon);
router.delete('/:id', verifyToken, verifyAdmin, deleteCoupon);

module.exports = router;
