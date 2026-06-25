const crypto = require('crypto');
const axios = require('axios');

function getCashfreeUrl() {
  return process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

function getCashfreeHeaders() {
  if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
    throw new Error('Cashfree is not configured');
  }
  return {
    'x-client-id': process.env.CASHFREE_APP_ID,
    'x-client-secret': process.env.CASHFREE_SECRET_KEY,
    'x-api-version': '2023-08-01',
    'Content-Type': 'application/json',
  };
}

async function verifyOrderStatus(orderId) {
  try {
    const response = await axios.get(`${getCashfreeUrl()}/orders/${orderId}`, {
      headers: getCashfreeHeaders(),
    });
    return response.data;
  } catch (err) {
    console.error('Cashfree order fetch error:', err?.response?.data || err.message);
    return null;
  }
}

function verifyWebhookSignature(timestamp, rawBody, signature) {
  try {
    const secret = process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(timestamp + rawBody)
      .digest('base64');
    return expectedSignature === signature;
  } catch (e) {
    return false;
  }
}

module.exports = {
  getCashfreeUrl,
  getCashfreeHeaders,
  verifyOrderStatus,
  verifyWebhookSignature,
};
