const Course = require('../models/Course');
const User = require('../models/User');

function expiryFor(course, purchaseDate = new Date()) {
  const days = Math.max(30, Number(course?.validityDays || 30));
  return new Date(purchaseDate.getTime() + days * 24 * 60 * 60 * 1000);
}

async function grantAccess(order) {
  if (!order || order.status === 'success_granted') return;
  const user = await User.findById(order.user);
  if (!user) throw new Error('User not found for order');
  const purchaseDate = new Date();
  let orderExpiryDate = null;

  function addPurchaseDetail(course, isBundlePurchase) {
    const expiryDate = expiryFor(course, purchaseDate);
    if (!orderExpiryDate || (expiryDate && expiryDate > orderExpiryDate)) orderExpiryDate = expiryDate;
    user.purchasedCourseDetails.push({
      course: course._id,
      order: order._id,
      purchaseDate,
      expiryDate,
      isBundlePurchase,
    });
    if (!user.purchasedCourses.some((id) => id.toString() === course._id.toString())) {
      user.purchasedCourses.push(course._id);
    }
  }

  if (order.isBundle) {
    user.hasBundle = true;
    const paidCourses = await Course.find({ isBundle: false, isActive: true }).select('_id validityDays');
    paidCourses.forEach((course) => addPurchaseDetail(course, true));
    await Course.updateMany({ isBundle: false, isActive: true }, { $inc: { enrolledCount: 1 } });
  } else if (order.course) {
    const course = await Course.findById(order.course);
    if (course) addPurchaseDetail(course, false);
    await Course.findByIdAndUpdate(order.course, { $inc: { enrolledCount: 1 } });
  }

  await user.save();
  order.purchaseDate = purchaseDate;
  order.expiryDate = orderExpiryDate;
  await order.save();
}

module.exports = { expiryFor, grantAccess };
