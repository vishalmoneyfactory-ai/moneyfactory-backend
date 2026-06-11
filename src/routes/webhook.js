const router = require('express').Router();
const { webhook } = require('../controllers/paymentController');

router.post('/', webhook);

module.exports = router;
