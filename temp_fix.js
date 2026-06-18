require('dotenv').config(); 
const mongoose = require('mongoose'); 
const axios = require('axios'); 
mongoose.connect(process.env.MONGODB_URI).then(async () => { 
  const Video = require('./src/models/Video'); 
  const Course = require('./src/models/Course'); 
  const videos = await Video.find({ duration: 0, isActive: true }); 
  for(const v of videos) { 
    try {
      const res = await axios.get('https://video.bunnycdn.com/library/' + process.env.BUNNY_LIBRARY_ID + '/videos/' + v.bunnyVideoId, { headers: { AccessKey: process.env.BUNNY_STREAM_API_KEY } }); 
      if(res.data && res.data.length > 0) { 
        v.duration = res.data.length; 
        await v.save(); 
        const total = await Video.aggregate([{ $match: { course: v.course, isActive: true } }, { $group: { _id: null, total: { $sum: '$duration' } } }]); 
        await Course.findByIdAndUpdate(v.course, { totalDuration: total[0]?.total || 0 }); 
        console.log('Fixed:', v.title, res.data.length); 
      } else {
        console.log('Bunny still says 0 length for:', v.title);
      }
    } catch(e) { console.error('Error fetching', v.title, e.message); }
  } 
  process.exit(0); 
});
