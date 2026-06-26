const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  isBundle: { type: Boolean, default: false },
  cashfreeOrderId: { type: String, index: true },
  cashfreePaymentId: { type: String, index: true },
  cashfreeSignature: String,
  razorpayOrderId: { type: String, index: true },
  razorpayPaymentId: { type: String, index: true },
  razorpaySignature: String,
  amount: { type: Number, required: true, min: 0 },
  originalAmount: { type: Number, default: 0 },
  offerPercent: { type: Number, default: 0 },
  offerDiscountAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending', index: true },
  couponApplied: String,
  discountAmount: { type: Number, default: 0 },
  referralCode: { type: String, uppercase: true, trim: true },
  purchaseDate: { type: Date },
  expiryDate: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
