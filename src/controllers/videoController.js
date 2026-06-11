const bunnyClient = require('../config/bunny');
const Course = require('../models/Course');
const Video = require('../models/Video');
const generateSignedUrl = require('../utils/bunnySignedUrl');
const { canWatchVideo } = require('../utils/access');

async function streamUrl(req, res) {
  const video = await Video.findById(req.params.id).populate('course');
  if (!video || !video.isActive) return res.status(404).json({ message: 'Video not found' });
  if (!canWatchVideo(req.user, video)) return res.status(403).json({ message: 'Purchase required' });
  return res.json({ video: { id: video._id, title: video.title, duration: video.duration }, sources: generateSignedUrl(video.bunnyVideoId, video.bunnyLibraryId) });
}

async function uploadVideo(req, res) {
  const { courseId, title, description, duration, order, isFreePreview } = req.body;
  if (!req.file) return res.status(400).json({ message: 'Video file is required' });
  const course = await Course.findById(courseId);
  if (!course) return res.status(404).json({ message: 'Course not found' });

  const libraryId = process.env.BUNNY_LIBRARY_ID;
  const createResp = await bunnyClient.post(`/${libraryId}/videos`, { title: title || req.file.originalname });
  const bunnyVideoId = createResp.data.guid;
  await bunnyClient.put(`/${libraryId}/videos/${bunnyVideoId}`, req.file.buffer, {
    headers: { 'Content-Type': 'application/octet-stream' },
    maxBodyLength: Infinity,
  });

  const video = await Video.create({
    course: course._id,
    title: title || req.file.originalname,
    description,
    bunnyVideoId,
    bunnyLibraryId: libraryId,
    duration: Number(duration || 0),
    order: Number(order || 0),
    isFreePreview: isFreePreview === 'true' || isFreePreview === true,
  });
  course.videos.addToSet(video._id);
  course.totalVideos = await Video.countDocuments({ course: course._id, isActive: true });
  course.totalDuration = await Video.aggregate([{ $match: { course: course._id, isActive: true } }, { $group: { _id: null, total: { $sum: '$duration' } } }]).then((r) => r[0]?.total || 0);
  await course.save();
  return res.status(201).json({ video });
}

async function updateVideo(req, res) {
  const video = await Video.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!video) return res.status(404).json({ message: 'Video not found' });
  return res.json({ video });
}

async function deleteVideo(req, res) {
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ message: 'Video not found' });
  try {
    await bunnyClient.delete(`/${video.bunnyLibraryId}/videos/${video.bunnyVideoId}`);
  } catch (err) {
    console.warn('Bunny delete failed', err.message);
  }
  video.isActive = false;
  await video.save();
  await Course.findByIdAndUpdate(video.course, { $pull: { videos: video._id } });
  return res.json({ message: 'Video deleted' });
}

module.exports = { streamUrl, uploadVideo, updateVideo, deleteVideo };
