const Review = require('../models/Review');
const Course = require('../models/Course');
const { ownsCourse } = require('../utils/access');

async function listReviews(req, res) {
  const reviews = await Review.find({ course: req.params.courseId }).populate('user', 'name').sort({ createdAt: -1 });
  return res.json({ reviews });
}

async function upsertReview(req, res) {
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  if (!ownsCourse(req.user, course)) return res.status(403).json({ message: 'Only enrolled students can review this course' });
  const review = await Review.findOneAndUpdate(
    { user: req.user._id, course: course._id },
    { rating: req.body.rating, comment: req.body.comment },
    { upsert: true, new: true, runValidators: true }
  );
  return res.json({ review });
}

async function deleteReview(req, res) {
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ message: 'Review not found' });
  if (req.user.role !== 'admin' && review.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not allowed' });
  await review.deleteOne();
  return res.json({ message: 'Review deleted' });
}

module.exports = { listReviews, upsertReview, deleteReview };
