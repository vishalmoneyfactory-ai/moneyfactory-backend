const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { verifyAdmin } = require('../middleware/adminAuth');
const admin = require('../controllers/adminController');

router.use(verifyToken, verifyAdmin);
router.get('/dashboard', admin.dashboard);
router.get('/courses', admin.courses);
router.put('/courses/offers', admin.updateOffers);
router.get('/students', admin.students);
router.get('/orders', admin.orders);
router.put('/students/:id/access', admin.updateAccess);
router.put('/students/:id/ban', admin.banStudent);
router.post('/notifications/send', admin.sendNotification);
router.get('/notifications', admin.notifications);
router.get('/analytics', admin.analytics);
router.get('/export/orders', admin.exportOrders);
router.put('/password', admin.changePassword);
router.put('/settings/:key', admin.updateSetting);
router.get('/referrals', admin.referralSummary);
router.put('/referrals/:id/paid', admin.markReferralPaid);
router.delete('/videos/:id', admin.deleteVideo);

module.exports = router;
