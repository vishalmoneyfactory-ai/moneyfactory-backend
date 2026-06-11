const WatchProgress = require('../models/WatchProgress');
const Video = require('../models/Video');

async function updateProgress(req, res) {
  const { videoId, watchedSeconds, totalSeconds } = req.body;
  const video = await Video.findById(videoId);
  if (!video) return res.status(404).json({ message: 'Video not found' });
  const watched = Math.max(Number(watchedSeconds || 0), 0);
  const total = Math.max(Number(totalSeconds || video.duration || 0), 0);
  const progress = await WatchProgress.findOneAndUpdate(
    { user: req.user._id, video: video._id },
    {
      user: req.user._id,
      video: video._id,
      course: video.course,
      watchedSeconds: watched,
      totalSeconds: total,
      isCompleted: total > 0 && watched / total >= 0.9,
      lastWatchedAt: new Date(),
      $push: { dropOffPoints: { second: watched, at: new Date() } },
    },
    { upsert: true, new: true }
  );
  return res.json({ progress });
}

async function courseProgress(req, res) {
  const progress = await WatchProgress.find({ user: req.user._id, course: req.params.courseId }).populate('video', 'title duration order');
  return res.json({ progress });
}

async function allProgress(req, res) {
  const progress = await WatchProgress.find({ user: req.user._id }).populate('course', 'title thumbnail totalVideos').populate('video', 'title duration order');
  return res.json({ progress });
}

module.exports = { updateProgress, courseProgress, allProgress };
