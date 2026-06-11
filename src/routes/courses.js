const router = require('express').Router();
const { listCourses, bundleInfo, courseDetail, courseVideos, unlockFreeCourse, createCourse, updateCourse, deleteCourse } = require('../controllers/courseController');
const { verifyToken, optionalToken } = require('../middleware/auth');
const { verifyAdmin } = require('../middleware/adminAuth');

router.get('/', optionalToken, listCourses);
router.get('/bundle', bundleInfo);
router.get('/:id', optionalToken, courseDetail);
router.get('/:id/videos', verifyToken, courseVideos);
router.post('/:id/unlock', verifyToken, unlockFreeCourse);
router.post('/', verifyToken, verifyAdmin, createCourse);
router.put('/:id', verifyToken, verifyAdmin, updateCourse);
router.delete('/:id', verifyToken, verifyAdmin, deleteCourse);

module.exports = router;
