const mongoose = require('mongoose');

const referralPayoutSchema = new mongoose.Schema({
  reward: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralReward', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  method: { type: String, trim: true, default: 'Manual Transfer' },
  note: { type: String, trim: true, default: '' },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('ReferralPayout', referralPayoutSchema);
