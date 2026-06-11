const crypto = require('crypto');

function generateSignedUrl(videoId, libraryId) {
  if (!process.env.BUNNY_TOKEN_KEY) throw new Error('BUNNY_TOKEN_KEY is required');
  const expiryTime = Math.floor(Date.now() / 1000) + 3600;
  const token = crypto
    .createHash('sha256')
    .update(process.env.BUNNY_TOKEN_KEY + videoId + expiryTime)
    .digest('hex');
  return {
    url480: `https://video.bunnycdn.com/play/${libraryId}/${videoId}/playlist.m3u8?token=${token}&expires=${expiryTime}&quality=480p`,
    url720: `https://video.bunnycdn.com/play/${libraryId}/${videoId}/playlist.m3u8?token=${token}&expires=${expiryTime}&quality=720p`,
    expiresAt: expiryTime,
  };
}

module.exports = generateSignedUrl;
