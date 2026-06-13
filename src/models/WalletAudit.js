const mongoose = require('mongoose');

const walletAuditSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['Wallet Credit', 'Wallet Deduction', 'Referral Reward', 'Referral Payout'],
    required: true,
    index: true,
  },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  reward: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralReward' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  note: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('WalletAudit', walletAuditSchema);
