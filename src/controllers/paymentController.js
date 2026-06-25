const axios = require('axios');
const Course = require('../models/Course');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const { computeDiscount } = require('./couponController');
const { getCashfreeUrl, getCashfreeHeaders, verifyOrderStatus, verifyWebhookSignature } = require('../utils/cashfreeVerify');
const { grantAccess } = require('../utils/paymentAccess');
const { serializePricing } = require('../utils/pricing');
const { creditReferralReward, validateReferralCode } = require('../utils/referrals');

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
  
  const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  try {
    const cfResponse = await axios.post(`${getCashfreeUrl()}/orders`, {
      order_id: orderId,
      order_amount: finalAmount,
      order_currency: 'INR',
      customer_details: {
        customer_id: req.user._id.toString(),
        customer_name: req.user.name || 'Student',
        customer_phone: String(req.user.phone).replace(/[^0-9]/g, ''),
        customer_email: req.user.email || 'student@moneyfactory.com',
      },
      order_meta: {
        return_url: `https://moneyfactory.app/payment/return?order_id=${orderId}`
      },
      order_tags: {
        userId: req.user._id.toString(),
        courseId: course._id.toString(),
        isBundle: String(Boolean(isBundle)),
        referralCode: referral?.code || '',
      }
    }, { headers: getCashfreeHeaders() });

    const { payment_session_id } = cfResponse.data;

    const order = await Order.create({
      user: req.user._id,
      course: isBundle ? null : course._id,
      isBundle: Boolean(isBundle),
      cashfreeOrderId: orderId,
      amount: finalAmount,
      originalAmount: course.price,
      offerPercent: pricing.offerPercent,
      offerDiscountAmount: pricing.offerDiscount,
      couponApplied: couponCode?.toUpperCase(),
      discountAmount,
      referralCode: referral?.code,
    });

    return res.status(201).json({ 
      order, 
      orderId, 
      paymentSessionId: payment_session_id, 
      amount: finalAmount, 
      currency: 'INR', 
      appId: process.env.CASHFREE_APP_ID,
      environment: process.env.CASHFREE_ENVIRONMENT || 'SANDBOX',
    });
  } catch (err) {
    console.error('Cashfree order creation failed:', err?.response?.data || err.message);
    return res.status(500).json({ message: 'Payment gateway error', details: err?.response?.data });
  }
}

async function verifyPayment(req, res) {
  const { orderId } = req.body;
  const order = await Order.findOne({ cashfreeOrderId: orderId, user: req.user._id });
  
  if (!order) return res.status(404).json({ message: 'Order not found' });
  
  const cashfreeOrder = await verifyOrderStatus(orderId);
  if (!cashfreeOrder) {
    return res.status(500).json({ message: 'Failed to verify order with Cashfree' });
  }

  if (cashfreeOrder.order_status === 'PAID') {
    if (order.status !== 'success') {
      order.status = 'success';
      await order.save();
      await grantAccess(order);
      const reward = await creditReferralReward(order);
      if (order.couponApplied) await Coupon.findOneAndUpdate({ code: order.couponApplied }, { $inc: { usedCount: 1 } });
      return res.json({ message: 'Payment verified successfully', order, referralReward: reward });
    }
    return res.json({ message: 'Payment already verified', order });
  } else {
    order.status = 'failed';
    await order.save();
    return res.status(400).json({ message: 'Payment failed or incomplete', status: cashfreeOrder.order_status });
  }
}

async function webhook(req, res) {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const rawBody = req.body; // Usually you need the raw body buffer for crypto
  
  if (signature && timestamp) {
    // If you configured the webhook secret, you can verify it.
    // However, as a failsafe, we directly verify the order_id with Cashfree.
    if (!verifyWebhookSignature(timestamp, rawBody.toString('utf8'), signature)) {
       // Just a warning, we still proceed to check API directly.
       console.warn('Webhook signature mismatch, falling back to API verification');
    }
  }

  const payload = JSON.parse(rawBody.toString('utf8'));
  
  // Cashfree sends type: "PAYMENT_SUCCESS_WEBHOOK"
  if (payload.type === 'PAYMENT_SUCCESS_WEBHOOK' || payload.event === 'PAYMENT_SUCCESS_WEBHOOK') {
    const orderId = payload.data?.order?.order_id;
    if (orderId) {
      const cashfreeOrder = await verifyOrderStatus(orderId);
      if (cashfreeOrder && cashfreeOrder.order_status === 'PAID') {
        const order = await Order.findOne({ cashfreeOrderId: orderId });
        if (order && order.status !== 'success') {
          order.status = 'success';
          await order.save();
          await grantAccess(order);
          await creditReferralReward(order);
          if (order.couponApplied) await Coupon.findOneAndUpdate({ code: order.couponApplied }, { $inc: { usedCount: 1 } });
        }
      }
    }
  }
  
  return res.json({ ok: true });
}

async function history(req, res) {
  const orders = await Order.find({ user: req.user._id }).populate('course', 'title thumbnail').sort({ createdAt: -1 });
  return res.json({ orders });
}

module.exports = { createOrder, verifyPayment, webhook, history };
