const bcrypt = require('bcrypt');
const admin = require('../config/firebase');
const User = require('../models/User');
const Course = require('../models/Course');
const Order = require('../models/Order');
const WatchProgress = require('../models/WatchProgress');
const NotificationLog = require('../models/NotificationLog');
const AppSetting = require('../models/AppSetting');
const Video = require('../models/Video');
const ReferralReward = require('../models/ReferralReward');
const ReferralPayout = require('../models/ReferralPayout');
const WalletAudit = require('../models/WalletAudit');
const { applyPricing } = require('../utils/pricing');
const { expiryFor } = require('../utils/paymentAccess');

function bunnyThumbnail(video) {
  if (!video?.bunnyVideoId || !video?.bunnyLibraryId) return '';
  const host = process.env.BUNNY_CDN_HOSTNAME || `vz-${video.bunnyLibraryId}.b-cdn.net`;
  return `https://${host}/${video.bunnyVideoId}/thumbnail.jpg`;
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

async function dashboard(_req, res) {
  const [revenue, students, thisMonthRevenue, newStudents, recentOrders, topCourses] = await Promise.all([
    Order.aggregate([{ $match: { status: 'success' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    User.countDocuments({ role: 'student' }),
    Order.aggregate([
      { $match: { status: 'success', createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    User.countDocuments({ role: 'student', createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
    Order.find().populate('user', 'name email').populate('course', 'title').sort({ createdAt: -1 }).limit(10),
    Course.find({ isBundle: false }).sort({ enrolledCount: -1 }).limit(6),
  ]);
  return res.json({
    stats: {
      totalRevenue: revenue[0]?.total || 0,
      totalOrders: revenue[0]?.count || 0,
      totalStudents: students,
      revenueThisMonth: thisMonthRevenue[0]?.total || 0,
      newStudentsThisWeek: newStudents,
    },
    recentOrders,
    topCourses,
  });
}

async function courses(_req, res) {
  const rows = await Course.find().sort({ order: 1 }).populate({
    path: 'videos',
    select: 'title duration order isFreePreview isActive bunnyVideoId bunnyLibraryId',
    options: { sort: { order: 1 } },
  });
  return res.json({
    courses: rows.map((course) => {
      const json = course.toObject();
      if (!json.thumbnail) {
        const firstVideo = Array.isArray(json.videos) ? json.videos.find((video) => video?.bunnyVideoId) : null;
        json.thumbnail = bunnyThumbnail(firstVideo);
      }
      return applyPricing(json);
    }),
  });
}

async function updateOffers(req, res) {
  const { scope, courseId, offerPercent, offerActive } = req.body;
  const percent = Number(offerPercent || 0);
  if (Number.isNaN(percent) || percent < 0 || percent > 99) return res.status(400).json({ message: 'Offer percent must be between 0 and 99' });

  const update = {
    offerActive: Boolean(offerActive) && percent > 0,
    offerPercent: Boolean(offerActive) && percent > 0 ? percent : 0,
  };
  const filter = scope === 'all'
    ? { isBundle: false, isFree: { $ne: true } }
    : { _id: courseId, isFree: { $ne: true } };

  if (scope !== 'all' && !courseId) return res.status(400).json({ message: 'Course is required for a specific offer' });
  const result = await Course.updateMany(filter, update);
  return res.json({ message: 'Offer updated', matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
}

async function students(req, res) {
  const { q, status } = req.query;
  const filter = { role: 'student' };
  if (status === 'active') filter.isActive = true;
  if (status === 'banned') filter.isActive = false;
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
  const rows = await User.find(filter)
    .populate('purchasedCourses', 'title')
    .populate('purchasedCourseDetails.course', 'title')
    .sort({ createdAt: -1 });
  const totals = await Order.aggregate([{ $match: { status: 'success' } }, { $group: { _id: '$user', totalSpent: { $sum: '$amount' } } }]);
  const totalMap = new Map(totals.map((t) => [t._id.toString(), t.totalSpent]));
  return res.json({ students: rows.map((student) => ({ ...student.toObject(), totalSpent: totalMap.get(student._id.toString()) || 0 })) });
}

async function orders(req, res) {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.course) filter.course = req.query.course;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }
  const rows = await Order.find(filter).populate('user', 'name email').populate('course', 'title').sort({ createdAt: -1 });
  return res.json({ orders: rows });
}

async function updateAccess(req, res) {
  const { courseId, hasAccess, hasBundle } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Student not found' });
  if (typeof hasBundle === 'boolean') user.hasBundle = hasBundle;
  if (courseId) {
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const exists = user.purchasedCourses.some((id) => id.toString() === courseId);
    if (hasAccess && !exists) user.purchasedCourses.push(courseId);
    if (hasAccess) {
      const purchaseDate = new Date();
      user.purchasedCourseDetails.push({
        course: courseId,
        purchaseDate,
        expiryDate: expiryFor({ ...course.toObject(), validityDays: 30 }, purchaseDate),
        isBundlePurchase: false,
      });
    }
    if (!hasAccess) user.purchasedCourses = user.purchasedCourses.filter((id) => id.toString() !== courseId);
    if (!hasAccess) user.purchasedCourseDetails = user.purchasedCourseDetails.filter((entry) => entry.course.toString() !== courseId);
  }
  await user.save();
  return res.json({ user });
}

async function banStudent(req, res) {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true });
  if (!user) return res.status(404).json({ message: 'Student not found' });
  return res.json({ user });
}

async function analytics(_req, res) {
  const revenueByDay = await Order.aggregate([
    { $match: { status: 'success' } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$amount' }, orders: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $limit: 60 },
  ]);
  const courseCompletion = await WatchProgress.aggregate([
    { $group: { _id: '$course', completed: { $sum: { $cond: ['$isCompleted', 1, 0] } }, watched: { $sum: 1 } } },
    { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
    { $unwind: '$course' },
  ]);
  const activeUsers = await User.countDocuments({ lastActiveAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
  const monthlyActiveUsers = await User.countDocuments({ lastActiveAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
  return res.json({ revenueByDay, courseCompletion, activeUsers, monthlyActiveUsers });
}

async function exportOrders(_req, res) {
  const rows = await Order.find().populate('user', 'name email').populate('course', 'title').sort({ createdAt: -1 });
  const header = ['Order ID', 'Student', 'Email', 'Course', 'Amount', 'Discount', 'Coupon', 'Status', 'Date'];
  const csv = [header.join(',')].concat(rows.map((order) => [
    order.razorpayOrderId,
    order.user?.name,
    order.user?.email,
    order.isBundle ? 'Full Bundle' : order.course?.title,
    order.amount,
    order.discountAmount,
    order.couponApplied,
    order.status,
    order.createdAt.toISOString(),
  ].map(csvEscape).join(','))).join('\n');
  res.header('Content-Type', 'text/csv');
  res.attachment('money-factory-orders.csv');
  return res.send(csv);
}

async function sendNotification(req, res) {
  const { target, studentId, title, message } = req.body;
  if (!(admin.apps || []).length) return res.status(500).json({ message: 'Firebase Admin is not configured' });
  const filter = target === 'student' ? { _id: studentId, fcmToken: { $exists: true, $ne: '' } } : { role: 'student', fcmToken: { $exists: true, $ne: '' } };
  const users = await User.find(filter).select('fcmToken');
  const tokens = users.map((u) => u.fcmToken).filter(Boolean);
  let sentCount = 0;
  let status = 'sent';
  let error = '';
  if (tokens.length) {
    const response = await admin.messaging().sendEachForMulticast({ tokens, notification: { title, body: message } });
    sentCount = response.successCount;
    status = response.failureCount ? 'partial' : 'sent';
  }
  const log = await NotificationLog.create({ target, student: studentId, title, message, sentCount, status, error });
  return res.json({ log });
}

async function notifications(_req, res) {
  const logs = await NotificationLog.find().populate('student', 'name email').sort({ createdAt: -1 });
  return res.json({ notifications: logs });
}

async function changePassword(req, res) {
  const { password } = req.body;
  if (!password || password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
  const passwordHash = await bcrypt.hash(password, 12);
  await User.findByIdAndUpdate(req.user._id, { passwordHash });
  return res.json({ message: 'Password updated' });
}

async function updateSetting(req, res) {
  const setting = await AppSetting.findOneAndUpdate({ key: req.params.key }, { value: req.body.value }, { upsert: true, new: true });
  return res.json({ setting });
}

async function referralSummary(_req, res) {
  const [pending, paid, rewardsByStatus, walletUsers, audits] = await Promise.all([
    ReferralReward.find({ status: 'Pending' })
      .populate('referrerId', 'name email phone walletBalance referralCode')
      .populate('referredUserId', 'name email phone')
      .populate('courseId', 'title')
      .sort({ createdAt: -1 }),
    ReferralReward.find({ status: 'Paid' })
      .populate('referrerId', 'name email phone walletBalance referralCode')
      .populate('referredUserId', 'name email phone')
      .populate('courseId', 'title')
      .sort({ paidAt: -1, createdAt: -1 }),
    ReferralReward.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$rewardAmount' } } }]),
    User.find({ role: 'student', $or: [{ walletBalance: { $gt: 0 } }, { totalReferrals: { $gt: 0 } }] })
      .select('name email phone walletBalance totalReferrals referralCode')
      .sort({ walletBalance: -1 }),
    WalletAudit.find()
      .populate('user', 'name email phone')
      .populate('reward')
      .sort({ createdAt: -1 })
      .limit(100),
  ]);
  const stats = rewardsByStatus.reduce((acc, row) => {
    acc[row._id.toLowerCase()] = { count: row.count, amount: row.amount };
    return acc;
  }, {});
  return res.json({ pending, paid, stats, walletUsers, audits });
}

async function markReferralPaid(req, res) {
  const { method, note } = req.body;
  const reward = await ReferralReward.findById(req.params.id);
  if (!reward) return res.status(404).json({ message: 'Referral reward not found' });
  if (reward.status === 'Paid') return res.status(400).json({ message: 'Referral reward is already paid' });

  const user = await User.findById(reward.referrerId);
  if (!user) return res.status(404).json({ message: 'Referrer not found' });
  const amount = reward.rewardAmount;
  user.walletBalance = Math.max(0, Number(user.walletBalance || 0) - amount);
  await user.save();

  reward.status = 'Paid';
  reward.paidAt = new Date();
  await reward.save();

  const payout = await ReferralPayout.create({
    reward: reward._id,
    user: user._id,
    amount,
    method: method || 'Manual Transfer',
    note,
    paidBy: req.user._id,
  });
  await WalletAudit.create([
    {
      user: user._id,
      type: 'Wallet Deduction',
      amount: -amount,
      balanceAfter: user.walletBalance,
      reward: reward._id,
      note: `Referral payout marked paid by admin via ${payout.method}`,
    },
    {
      user: user._id,
      type: 'Referral Payout',
      amount: -amount,
      balanceAfter: user.walletBalance,
      reward: reward._id,
      note: note || 'Manual referral payout completed',
    },
  ]);
  return res.json({ reward, payout, user });
}

async function deleteVideo(req, res) {
  const video = await Video.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!video) return res.status(404).json({ message: 'Video not found' });
  return res.json({ video });
}

module.exports = { dashboard, courses, updateOffers, students, orders, updateAccess, banStudent, analytics, exportOrders, sendNotification, notifications, changePassword, updateSetting, referralSummary, markReferralPaid, deleteVideo };
