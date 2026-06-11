const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  shortDescription: { type: String, default: '' },
  price: { type: Number, default: 0, min: 0 },
  isFree: { type: Boolean, default: false },
  isBundle: { type: Boolean, default: false },
  offerActive: { type: Boolean, default: false },
  offerPercent: { type: Number, default: 0, min: 0, max: 99 },
  thumbnail: { type: String, default: '' },
  category: { type: String, default: 'Trading Education' },
  outcomes: [{ type: String }],
  videos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
  totalDuration: { type: Number, default: 0 },
  totalVideos: { type: Number, default: 0 },
  enrolledCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0, index: true },
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
