const bunnyClient = require('../config/bunny');
const Course = require('../models/Course');
const Video = require('../models/Video');
const generateSignedUrl = require('../utils/bunnySignedUrl');
const { canWatchVideo } = require('../utils/access');
const mongoose = require('mongoose');

async function streamUrl(req, res) {
  const video = await Video.findById(req.params.id).populate('course');
  if (!video || !video.isActive) return res.status(404).json({ message: 'Video not found' });
  if (!canWatchVideo(req.user, video)) return res.status(403).json({ message: 'Course Expired - Repurchase Required.' });
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

async function createVideoEntry(req, res) {
  const { courseId, title, description, duration, order, isFreePreview } = req.body;
  const course = await Course.findById(courseId);
  if (!course) return res.status(404).json({ message: 'Course not found' });

  const libraryId = process.env.BUNNY_LIBRARY_ID;
  const collectionId = course.bunnyCollectionId || '';

  const payload = { title: title || 'Untitled Video' };
  if (collectionId) payload.collectionId = collectionId;

  try {
    const createResp = await bunnyClient.post(`/${libraryId}/videos`, payload);
    const bunnyVideoId = createResp.data.guid;

    const video = await Video.create({
      course: course._id,
      title: title || 'Untitled Video',
      description,
      bunnyVideoId,
      bunnyLibraryId: libraryId,
      duration: Number(duration || 0),
      order: Number(order || 0),
      isFreePreview: isFreePreview === 'true' || isFreePreview === true,
      isActive: false,
    });

    course.videos.addToSet(video._id);
    await course.save();

    const expirationTime = Math.floor(Date.now() / 1000) + 3600 * 24;
    const crypto = require('crypto');
    const signature = crypto.createHash('sha256').update(libraryId + process.env.BUNNY_STREAM_API_KEY + expirationTime + bunnyVideoId).digest('hex');

    return res.status(201).json({ 
      video,
      tusEndpoint: `https://video.bunnycdn.com/tusupload`,
      libraryId,
      bunnyVideoId,
      signature,
      expirationTime
    });
  } catch (err) {
    const errorMsg = err.response?.data?.Message || err.message;
    return res.status(500).json({ message: `Bunny API Error: ${errorMsg}` });
  }
}

async function markVideoActive(req, res) {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });
    
    video.isActive = true;
    try {
      const resp = await bunnyClient.get(`/${process.env.BUNNY_LIBRARY_ID}/videos/${video.bunnyVideoId}`);
      if (resp.data && resp.data.length) video.duration = resp.data.length;
    } catch(e) { console.error('Failed to get duration', e.message); }
    await video.save();

    const totalDuration = await Video.aggregate([
      { $match: { course: new mongoose.Types.ObjectId(video.course), isActive: true } },
      { $group: { _id: null, total: { $sum: '$duration' } } }
    ]).then(r => r[0]?.total || 0);

    await Course.findByIdAndUpdate(video.course, { totalDuration, $addToSet: { videos: video._id } });
    
    res.json(video);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function importFromBunny(req, res) {
  try {
    const libraryId = process.env.BUNNY_LIBRARY_ID;
    let url = `/${libraryId}/videos?itemsPerPage=100`;
    if (req.query.collectionId) {
      url += `&collection=${req.query.collectionId}`;
    }
    const resp = await bunnyClient.get(url);
    const existingIds = await Video.find({ bunnyLibraryId: libraryId }).distinct('bunnyVideoId');
    const existingSet = new Set(existingIds);
    
    const unmapped = resp.data.items.filter(v => !existingSet.has(v.guid));
    return res.json({ videos: unmapped });
  } catch (err) {
    const errorMsg = err.response?.data?.Message || err.message;
    return res.status(500).json({ message: `Bunny API Error: ${errorMsg}` });
  }
}

async function confirmImport(req, res) {
  const { courseId, bunnyVideoId, title, duration, order, isFreePreview } = req.body;
  const course = await Course.findById(courseId);
  if (!course) return res.status(404).json({ message: 'Course not found' });

  const libraryId = process.env.BUNNY_LIBRARY_ID;
  const video = await Video.create({
    course: course._id,
    title,
    bunnyVideoId,
    bunnyLibraryId: libraryId,
    duration: Number(duration || 0),
    order: Number(order || 0),
    isFreePreview: isFreePreview === 'true' || isFreePreview === true,
    isActive: true,
  });

  course.videos.addToSet(video._id);
  course.totalVideos = await Video.countDocuments({ course: course._id, isActive: true });
  course.totalDuration = await Video.aggregate([{ $match: { course: course._id, isActive: true } }, { $group: { _id: null, total: { $sum: '$duration' } } }]).then((r) => r[0]?.total || 0);
  await course.save();

  return res.status(201).json({ video });
}

module.exports = { streamUrl, uploadVideo, updateVideo, deleteVideo, createVideoEntry, markVideoActive, importFromBunny, confirmImport };
