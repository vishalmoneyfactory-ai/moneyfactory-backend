const mongoose = require('mongoose');
const Video = require('./src/models/Video');
const Course = require('./src/models/Course');
const axios = require('axios');
require('dotenv').config({ path: 'd:/Money Factory app/moneyfactory-backend/.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const libraryId = process.env.BUNNY_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  
  const videos = await Video.find({ isActive: true });
  for (const v of videos) {
    if (v.duration === 0) {
      try {
        const resp = await axios.get(`https://video.bunnycdn.com/library/${libraryId}/videos/${v.bunnyVideoId}`, { headers: { AccessKey: apiKey } });
        if (resp.data && resp.data.length) {
          console.log('Updating', v.title, 'to duration', resp.data.length);
          v.duration = resp.data.length;
          await v.save();
        }
      } catch (err) {
        console.log('Failed to fetch for', v.title);
      }
    }
  }

  const courses = await Course.find();
  for (const course of courses) {
    course.totalDuration = await Video.aggregate([
      { $match: { course: course._id, isActive: true } }, 
      { $group: { _id: null, total: { $sum: '$duration' } } }
    ]).then(r => r[0]?.total || 0);
    await course.save();
    console.log('Updated course', course.title, course.totalDuration);
  }
  process.exit(0);
});
