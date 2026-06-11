const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
  target: { type: String, enum: ['all', 'student'], required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  message: { type: String, required: true, maxlength: 200 },
  sentCount: { type: Number, default: 0 },
  status: { type: String, enum: ['sent', 'failed', 'partial'], default: 'sent' },
  error: String,
}, { timestamps: true });

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
