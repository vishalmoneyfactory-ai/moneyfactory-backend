const router = require('express').Router();
const { createOrder, verifyPayment, history } = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/auth');

router.post('/create-order', verifyToken, createOrder);
router.post('/verify', verifyToken, verifyPayment);
router.get('/history', verifyToken, history);

module.exports = router;
