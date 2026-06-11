const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, unique: true, sparse: true, index: true },
  name: { type: String, trim: true },
  email: { type: String, unique: true, required: true, lowercase: true, trim: true, index: true },
  phone: { type: String, trim: true },
  profileImage: { type: String, default: '' },
  passwordHash: { type: String, select: false },
  role: { type: String, enum: ['student', 'admin'], default: 'student', index: true },
  purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  hasBundle: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  fcmToken: String,
  lastActiveAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
