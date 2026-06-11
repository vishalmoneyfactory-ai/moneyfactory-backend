const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  bunnyVideoId: { type: String, required: true },
  bunnyLibraryId: { type: String, required: true },
  duration: { type: Number, default: 0 },
  order: { type: Number, default: 0 },
  isFreePreview: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Video', videoSchema);
