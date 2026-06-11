const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, unique: true, uppercase: true, required: true, trim: true },
  discountType: { type: String, enum: ['percentage', 'flat'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  applicableOn: { type: String, enum: ['all', 'bundle', 'specific'], default: 'all' },
  specificCourse: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  expiryDate: Date,
  usageLimit: Number,
  usedCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
