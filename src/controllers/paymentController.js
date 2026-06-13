const Razorpay = require('razorpay');
const Course = require('../models/Course');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const { computeDiscount } = require('./couponController');
const { verifyPaymentSignature, verifyWebhookSignature } = require('../utils/razorpayVerify');
const { grantAccess } = require('../utils/paymentAccess');
const { serializePricing } = require('../utils/pricing');
const { creditReferralReward, validateReferralCode } = require('../utils/referrals');

function razorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) throw new Error('Razorpay is not configured');
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}

async function createOrder(req, res) {
  const { courseId, isBundle, couponCode, referralCode } = req.body;
  if (!req.user.phone || !String(req.user.phone).trim()) {
    return res.status(400).json({ message: 'Please add your phone number before purchasing a course.', code: 'PHONE_REQUIRED' });
  }
  const course = isBundle
    ? await Course.findOne({ isBundle: true, isActive: true })
    : await Course.findOne({ _id: courseId, isActive: true });
  if (!course) return res.status(404).json({ message: 'Course not found' });
  if (course.isFree) return res.status(400).json({ message: 'Free course does not require payment' });
  const pricing = serializePricing(course);

  let discountAmount = 0;
  if (couponCode) {
    const discount = await computeDiscount({ code: couponCode, courseId: course._id, isBundle: Boolean(isBundle), basePrice: pricing.effectivePrice });
    discountAmount = discount.discountAmount;
  }
  const referral = await validateReferralCode(referralCode, req.user._id);
  const finalAmount = Math.max(pricing.effectivePrice - discountAmount, 0);
  const rpOrder = await razorpay().orders.create({
    amount: finalAmount * 100,
    currency: 'INR',
    receipt: `mf_${Date.now()}`,
    notes: {
      userId: req.user._id.toString(),
      courseId: course._id.toString(),
      isBundle: String(Boolean(isBundle)),
      referralCode: referral?.code || '',
    },
  });
  const order = await Order.create({
    user: req.user._id,
    course: isBundle ? null : course._id,
    isBundle: Boolean(isBundle),
    razorpayOrderId: rpOrder.id,
    amount: finalAmount,
    originalAmount: course.price,
    offerPercent: pricing.offerPercent,
    offerDiscountAmount: pricing.offerDiscount,
    couponApplied: couponCode?.toUpperCase(),
    discountAmount,
    referralCode: referral?.code,
  });
  return res.status(201).json({ order, orderId: rpOrder.id, amount: finalAmount, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID });
}

async function verifyPayment(req, res) {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const order = await Order.findOne({ razorpayOrderId, user: req.user._id });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    order.status = 'failed';
    await order.save();
    return res.status(400).json({ message: 'Invalid payment signature' });
  }
  if (order.status !== 'success') {
    order.status = 'success';
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpaySignature = razorpaySignature;
    await order.save();
    await grantAccess(order);
    const reward = await creditReferralReward(order);
    if (order.couponApplied) await Coupon.findOneAndUpdate({ code: order.couponApplied }, { $inc: { usedCount: 1 } });
    return res.json({ message: 'Payment verified', order, referralReward: reward });
  }
  return res.json({ message: 'Payment verified', order });
}

async function webhook(req, res) {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.body;
  if (!verifyWebhookSignature(rawBody, signature)) return res.status(400).json({ message: 'Invalid webhook signature' });
  const payload = JSON.parse(rawBody.toString('utf8'));
  if (payload.event === 'payment.captured') {
    const payment = payload.payload.payment.entity;
    const order = await Order.findOne({ razorpayOrderId: payment.order_id });
    if (order && order.status !== 'success') {
      order.status = 'success';
      order.razorpayPaymentId = payment.id;
      await order.save();
      await grantAccess(order);
      await creditReferralReward(order);
      if (order.couponApplied) await Coupon.findOneAndUpdate({ code: order.couponApplied }, { $inc: { usedCount: 1 } });
    }
  }
  return res.json({ ok: true });
}

async function history(req, res) {
  const orders = await Order.find({ user: req.user._id }).populate('course', 'title thumbnail').sort({ createdAt: -1 });
  return res.json({ orders });
}

module.exports = { createOrder, verifyPayment, webhook, history };
