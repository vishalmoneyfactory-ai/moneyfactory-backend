const axios = require('axios');

const bunnyClient = axios.create({
  baseURL: 'https://video.bunnycdn.com/library',
  timeout: 600000,
});

bunnyClient.interceptors.request.use((config) => {
  if (!process.env.BUNNY_STREAM_API_KEY) {
    throw new Error('BUNNY_STREAM_API_KEY is required');
  }
  config.headers.AccessKey = process.env.BUNNY_STREAM_API_KEY;
  return config;
});

module.exports = bunnyClient;
