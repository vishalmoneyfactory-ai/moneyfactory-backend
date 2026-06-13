const AppSetting = require('../models/AppSetting');
const Course = require('../models/Course');
const Order = require('../models/Order');
const ReferralReward = require('../models/ReferralReward');
const User = require('../models/User');
const WalletAudit = require('../models/WalletAudit');

async function referralRewardAmount() {
  const setting = await AppSetting.findOne({ key: 'referralRewardAmount' });
  const amount = Number(setting?.value ?? 1000);
  return Number.isFinite(amount) && amount >= 0 ? amount : 1000;
}

async function validateReferralCode(code, userId) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return null;
  const referrer = await User.findOne({ referralCode: normalized, role: 'student', isActive: true });
  if (!referrer) {
    const error = new Error('Referral code does not exist');
    error.status = 400;
    throw error;
  }
  if (referrer._id.toString() === userId.toString()) {
    const error = new Error('You cannot use your own referral code');
    error.status = 400;
    throw error;
  }
  return { code: normalized, referrer };
}

async function creditReferralReward(order) {
  if (!order?.referralCode || order.status !== 'success') return null;
  const existing = await ReferralReward.findOne({ orderId: order._id });
  if (existing) return existing;

  const referredUser = await User.findById(order.user);
  if (!referredUser) return null;
  const validation = await validateReferralCode(order.referralCode, referredUser._id);
  if (!validation) return null;

  const courseId = order.isBundle
    ? (await Course.findOne({ isBundle: true }).select('_id'))?._id
    : order.course;
  if (!courseId) return null;

  const amount = await referralRewardAmount();
  const reward = await ReferralReward.create({
    referrerId: validation.referrer._id,
    referredUserId: referredUser._id,
    courseId,
    orderId: order._id,
    rewardAmount: amount,
  });

  const referrer = await User.findByIdAndUpdate(
    validation.referrer._id,
    { $inc: { walletBalance: amount, totalReferrals: 1 } },
    { new: true }
  );
  await WalletAudit.create([
    {
      user: validation.referrer._id,
      type: 'Wallet Credit',
      amount,
      balanceAfter: referrer.walletBalance,
      reward: reward._id,
      order: order._id,
      note: 'Referral reward credited after successful payment',
    },
    {
      user: validation.referrer._id,
      type: 'Referral Reward',
      amount,
      balanceAfter: referrer.walletBalance,
      reward: reward._id,
      order: order._id,
      note: `Referral code ${order.referralCode} used by ${referredUser.email}`,
    },
  ]);
  return reward;
}

async function referralHistory(userId) {
  return ReferralReward.find({ referrerId: userId })
    .populate('referredUserId', 'name email phone')
    .populate('courseId', 'title')
    .sort({ createdAt: -1 });
}

module.exports = { creditReferralReward, referralHistory, referralRewardAmount, validateReferralCode };
