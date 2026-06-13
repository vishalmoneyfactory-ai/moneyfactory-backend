const Course = require('../models/Course');
const Video = require('../models/Video');
const Review = require('../models/Review');
const { courseAccessInfo, ownsCourse } = require('../utils/access');
const { applyPricing } = require('../utils/pricing');

function bunnyThumbnail(video) {
  if (!video?.bunnyVideoId || !video?.bunnyLibraryId) return '';
  const host = process.env.BUNNY_CDN_HOSTNAME || `vz-${video.bunnyLibraryId}.b-cdn.net`;
  return `https://${host}/${video.bunnyVideoId}/thumbnail.jpg`;
}

function serializeCourse(course, user) {
  const json = course.toObject ? course.toObject() : course;
  if (!json.thumbnail) {
    const firstVideo = Array.isArray(json.videos) ? json.videos.find((video) => video?.bunnyVideoId) : null;
    json.thumbnail = bunnyThumbnail(firstVideo);
  }
  const access = user ? courseAccessInfo(user, course) : { isOwned: false, isExpired: false, purchaseDate: null, expiryDate: null, daysRemaining: null };
  json.isOwned = access.isOwned;
  json.access = access;
  return applyPricing(json);
}

async function listCourses(req, res) {
  const courses = await Course.find({ isActive: true }).sort({ order: 1 }).populate('videos', 'title duration order isFreePreview isActive bunnyVideoId bunnyLibraryId');
  const ratings = await Review.aggregate([
    { $group: { _id: '$course', avgRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } },
  ]);
  const ratingMap = new Map(ratings.map((r) => [r._id.toString(), r]));
  return res.json({
    courses: courses.map((course) => {
      const item = serializeCourse(course, req.user);
      const rating = ratingMap.get(course._id.toString());
      item.avgRating = rating ? Number(rating.avgRating.toFixed(1)) : 0;
      item.totalReviews = rating?.totalReviews || 0;
      return item;
    }),
  });
}

async function bundleInfo(_req, res) {
  const bundle = await Course.findOne({ isBundle: true, isActive: true });
  const courses = await Course.find({ isBundle: false, isActive: true }).sort({ order: 1 });
  const individualTotal = courses.reduce((sum, course) => sum + course.price, 0);
  const bundlePrice = bundle?.price || 4999;
  return res.json({
    bundle: bundle ? applyPricing(bundle.toObject()) : bundle,
    courses: courses.map((course) => applyPricing(course.toObject())),
    individualTotal,
    bundlePrice,
    savings: Math.max(individualTotal - bundlePrice, 0),
  });
}

async function courseDetail(req, res) {
  const course = await Course.findOne({ _id: req.params.id, isActive: true }).populate({
    path: 'videos',
    match: { isActive: true },
    select: 'title description duration order isFreePreview bunnyVideoId bunnyLibraryId',
    options: { sort: { order: 1 } },
  });
  if (!course) return res.status(404).json({ message: 'Course not found' });
  const reviews = await Review.find({ course: course._id }).populate('user', 'name').sort({ createdAt: -1 }).limit(20);
  const aggregate = await Review.aggregate([
    { $match: { course: course._id } },
    { $group: { _id: '$course', avgRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } },
  ]);
  return res.json({
    course: serializeCourse(course, req.user),
    reviews,
    avgRating: aggregate[0] ? Number(aggregate[0].avgRating.toFixed(1)) : 0,
    totalReviews: aggregate[0]?.totalReviews || 0,
  });
}

async function courseVideos(req, res) {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  if (!ownsCourse(req.user, course)) return res.status(403).json({ message: 'Course Expired - Repurchase Required.' });
  const videos = await Video.find({ course: course._id, isActive: true }).sort({ order: 1 });
  return res.json({ videos });
}

async function unlockFreeCourse(req, res) {
  const course = await Course.findOne({ _id: req.params.id, isActive: true });
  if (!course) return res.status(404).json({ message: 'Course not found' });
  if (!course.isFree) return res.status(400).json({ message: 'Only free courses can be unlocked directly' });

  const alreadyOwned = ownsCourse(req.user, course);
  if (!alreadyOwned) {
    req.user.purchasedCourses.addToSet(course._id);
    await req.user.save();
    course.enrolledCount += 1;
    await course.save();
  }

  return res.json({ message: alreadyOwned ? 'Course already unlocked' : 'Course unlocked', course: serializeCourse(course, req.user) });
}

async function createCourse(req, res) {
  const course = await Course.create(req.body);
  return res.status(201).json({ course });
}

async function updateCourse(req, res) {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!course) return res.status(404).json({ message: 'Course not found' });
  return res.json({ course });
}

async function deleteCourse(req, res) {
  const course = await Course.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!course) return res.status(404).json({ message: 'Course not found' });
  return res.json({ message: 'Course disabled', course });
}

module.exports = { listCourses, bundleInfo, courseDetail, courseVideos, unlockFreeCourse, createCourse, updateCourse, deleteCourse };
