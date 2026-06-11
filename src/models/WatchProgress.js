const mongoose = require('mongoose');

const watchProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  watchedSeconds: { type: Number, default: 0 },
  totalSeconds: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
  dropOffPoints: [{ second: Number, at: Date }],
  lastWatchedAt: { type: Date, default: Date.now },
}, { timestamps: true });

watchProgressSchema.index({ user: 1, video: 1 }, { unique: true });

module.exports = mongoose.model('WatchProgress', watchProgressSchema);
