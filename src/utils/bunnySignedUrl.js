const crypto = require('crypto');

function generateSignedUrl(videoId, libraryId) {
  if (!process.env.BUNNY_TOKEN_KEY) throw new Error('BUNNY_TOKEN_KEY is required');
  const expiryTime = Math.floor(Date.now() / 1000) + 3600;
  const hostname = process.env.BUNNY_CDN_HOSTNAME;
  const path = '/' + videoId + '/';
  const hashableBase = process.env.BUNNY_TOKEN_KEY + path + expiryTime;
  const token = crypto
    .createHash('sha256')
    .update(hashableBase)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const qs = `?token=${token}&expires=${expiryTime}&token_path=${encodeURIComponent(path)}`;

  return {
    url480: `https://${hostname}/${videoId}/480p/video.m3u8${qs}`,
    url720: `https://${hostname}/${videoId}/720p/video.m3u8${qs}`,
    expiresAt: expiryTime,
  };
}

module.exports = generateSignedUrl;
