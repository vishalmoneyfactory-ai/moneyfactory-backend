const crypto = require('crypto');

function verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, signature) {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expectedSig === signature;
}

function verifyWebhookSignature(rawBody, signature) {
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return expectedSig === signature;
}

module.exports = { verifyPaymentSignature, verifyWebhookSignature };
