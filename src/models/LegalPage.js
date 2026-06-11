const mongoose = require('mongoose');

const legalPageSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, enum: ['privacy-policy', 'terms-and-conditions', 'refund-policy', 'contact-us'] },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('LegalPage', legalPageSchema);
