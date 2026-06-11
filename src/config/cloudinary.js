const crypto = require('crypto');

function cloudinaryConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || 'money-factory',
  };
}

function assertConfigured(config) {
  if (!config.cloudName || !config.apiKey || !config.apiSecret) {
    const missing = [
      ['CLOUDINARY_CLOUD_NAME', config.cloudName],
      ['CLOUDINARY_API_KEY', config.apiKey],
      ['CLOUDINARY_API_SECRET', config.apiSecret],
    ].filter(([, value]) => !value).map(([key]) => key).join(', ');
    const error = new Error(`Cloudinary is not configured. Missing: ${missing}`);
    error.statusCode = 500;
    throw error;
  }
}

function signParams(params, apiSecret) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
}

async function uploadImageToCloudinary(file, folderName = '') {
  const config = cloudinaryConfig();
  assertConfigured(config);

  const params = {
    timestamp: Math.floor(Date.now() / 1000),
    folder: [config.folder, folderName].filter(Boolean).join('/'),
  };
  const signature = signParams(params, config.apiSecret);
  const form = new FormData();
  form.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname);
  form.append('api_key', config.apiKey);
  form.append('timestamp', String(params.timestamp));
  form.append('folder', params.folder);
  form.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || 'Cloudinary upload failed');
    error.statusCode = response.status;
    throw error;
  }

  return {
    url: data.secure_url,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
    format: data.format,
    bytes: data.bytes,
  };
}

module.exports = { uploadImageToCloudinary };
