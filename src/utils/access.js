function ownsCourse(user, course) {
  if (!course) return false;
  if (user?.hasBundle) return true;
  return user?.purchasedCourses?.some((id) => id.toString() === course._id.toString());
}

function canWatchVideo(user, video) {
  if (!video) return false;
  if (video.isFreePreview) return true;
  return ownsCourse(user, video.course);
}

module.exports = { ownsCourse, canWatchVideo };
