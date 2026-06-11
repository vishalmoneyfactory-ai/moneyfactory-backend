const router = require('express').Router();
const { listReviews, upsertReview, deleteReview } = require('../controllers/reviewController');
const { verifyToken } = require('../middleware/auth');

router.get('/course/:courseId', listReviews);
router.put('/course/:courseId', verifyToken, upsertReview);
router.delete('/:id', verifyToken, deleteReview);

module.exports = router;
