const Course = require('../models/Course');
const User = require('../models/User');

async function grantAccess(order) {
  if (!order || order.status === 'success_granted') return;
  const user = await User.findById(order.user);
  if (!user) throw new Error('User not found for order');

  if (order.isBundle) {
    user.hasBundle = true;
    const paidCourses = await Course.find({ isBundle: false, isActive: true }).select('_id');
    paidCourses.forEach((course) => {
      if (!user.purchasedCourses.some((id) => id.toString() === course._id.toString())) {
        user.purchasedCourses.push(course._id);
      }
    });
    await Course.updateMany({ isBundle: false, isActive: true }, { $inc: { enrolledCount: 1 } });
  } else if (order.course) {
    if (!user.purchasedCourses.some((id) => id.toString() === order.course.toString())) {
      user.purchasedCourses.push(order.course);
      await Course.findByIdAndUpdate(order.course, { $inc: { enrolledCount: 1 } });
    }
  }

  await user.save();
}

module.exports = { grantAccess };
