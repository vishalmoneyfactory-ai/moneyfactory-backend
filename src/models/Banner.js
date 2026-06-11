const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  subtitle: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  linkType: { type: String, enum: ['none', 'course', 'bundle', 'external'], default: 'none' },
  linkValue: { type: String, default: '' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);
