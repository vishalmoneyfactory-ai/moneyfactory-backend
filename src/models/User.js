const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, unique: true, sparse: true, index: true },
  name: { type: String, trim: true },
  email: { type: String, unique: true, required: true, lowercase: true, trim: true, index: true },
  phone: { type: String, trim: true },
  loginProvider: { type: String, enum: ['password', 'google', 'firebase', 'admin'], default: 'firebase' },
  profileImage: { type: String, default: '' },
  passwordHash: { type: String, select: false },
  role: { type: String, enum: ['student', 'admin'], default: 'student', index: true },
  purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  purchasedCourseDetails: [{
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    purchaseDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, default: null },
    isBundlePurchase: { type: Boolean, default: false },
  }],
  hasBundle: { type: Boolean, default: false },
  referralCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true, index: true },
  walletBalance: { type: Number, default: 0, min: 0 },
  totalReferrals: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
  fcmToken: String,
  lastActiveAt: Date,
}, { timestamps: true });

userSchema.pre('validate', async function assignReferralCode(next) {
  if (this.role !== 'student' || this.referralCode) return next();
  for (let i = 0; i < 12; i += 1) {
    const code = `MF${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await this.constructor.exists({ referralCode: code });
    if (!exists) {
      this.referralCode = code;
      return next();
    }
  }
  return next(new Error('Could not generate a unique referral code'));
});

module.exports = mongoose.model('User', userSchema);
