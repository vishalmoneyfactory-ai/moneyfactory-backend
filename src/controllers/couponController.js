const Coupon = require('../models/Coupon');
const Course = require('../models/Course');
const { serializePricing } = require('../utils/pricing');

async function computeDiscount({ code, courseId, isBundle, basePrice }) {
  if (!code) return { discountAmount: 0 };
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
  if (!coupon) throw Object.assign(new Error('Invalid or expired coupon'), { status: 400 });
  if (coupon.expiryDate && coupon.expiryDate < new Date()) throw Object.assign(new Error('Invalid or expired coupon'), { status: 400 });
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw Object.assign(new Error('Coupon usage limit reached'), { status: 400 });
  if (coupon.applicableOn === 'bundle' && !isBundle) throw Object.assign(new Error('Coupon is only valid for bundle'), { status: 400 });
  if (coupon.applicableOn === 'specific' && coupon.specificCourse?.toString() !== courseId?.toString()) {
    throw Object.assign(new Error('Coupon is not valid for this course'), { status: 400 });
  }

  const course = isBundle
    ? await Course.findOne({ isBundle: true, isActive: true })
    : await Course.findById(courseId);
  const price = Number(basePrice ?? serializePricing(course).effectivePrice);
  const discountAmount = coupon.discountType === 'percentage'
    ? Math.floor(price * coupon.discountValue / 100)
    : coupon.discountValue;
  return { coupon, discountAmount: Math.min(discountAmount, price), originalAmount: price };
}

async function validateCoupon(req, res) {
  try {
    const result = await computeDiscount(req.body);
    return res.json({
      valid: true,
      code: result.coupon?.code,
      discountAmount: result.discountAmount,
      originalAmount: result.originalAmount,
      finalAmount: Math.max((result.originalAmount || 0) - result.discountAmount, 0),
    });
  } catch (err) {
    return res.status(err.status || 400).json({ valid: false, message: err.message });
  }
}

async function createCoupon(req, res) {
  const coupon = await Coupon.create({ ...req.body, code: req.body.code?.toUpperCase() });
  return res.status(201).json({ coupon });
}

async function listCoupons(_req, res) {
  const coupons = await Coupon.find().populate('specificCourse', 'title').sort({ createdAt: -1 });
  return res.json({ coupons });
}

async function updateCoupon(req, res) {
  const data = { ...req.body };
  if (data.code) data.code = data.code.toUpperCase();
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
  return res.json({ coupon });
}

async function deleteCoupon(req, res) {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
  return res.json({ message: 'Coupon disabled', coupon });
}

module.exports = { computeDiscount, validateCoupon, createCoupon, listCoupons, updateCoupon, deleteCoupon };
