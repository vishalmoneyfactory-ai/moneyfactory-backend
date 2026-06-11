const router = require('express').Router();
const {
  verifyFirebase,
  adminSetupStatus,
  createFirstAdmin,
  adminLogin,
  me,
  updateMe,
  uploadProfileImage,
  removeProfileImage,
  updateFcmToken,
} = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { imageUpload } = require('../middleware/upload');

router.post('/verify-firebase', authLimiter, verifyFirebase);
router.get('/admin/setup-status', adminSetupStatus);
router.post('/admin/setup', authLimiter, createFirstAdmin);
router.post('/admin/login', authLimiter, adminLogin);
router.get('/me', verifyToken, me);
router.put('/me', verifyToken, updateMe);
router.post('/me/profile-image', verifyToken, imageUpload.single('image'), uploadProfileImage);
router.delete('/me/profile-image', verifyToken, removeProfileImage);
router.put('/fcm-token', verifyToken, updateFcmToken);

module.exports = router;
