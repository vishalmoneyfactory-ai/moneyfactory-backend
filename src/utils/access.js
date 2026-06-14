function effectiveExpiry(entry, courseOrId) {
  if (!entry) return null;
  if (entry.expiryDate) return entry.expiryDate;
  if (!entry.purchaseDate) return null;
  const days = Math.max(30, Number(courseOrId?.validityDays || 30));
  return new Date(new Date(entry.purchaseDate).getTime() + days * 24 * 60 * 60 * 1000);
}

function activeCourseAccess(user, courseOrId) {
  const courseId = (courseOrId?._id || courseOrId)?.toString();
  if (!courseId) return null;
  const now = Date.now();
  const details = user?.purchasedCourseDetails || [];
  const active = details
    .filter((entry) => (entry.course?._id || entry.course)?.toString() === courseId)
    .filter((entry) => {
      const expiryDate = effectiveExpiry(entry, courseOrId);
      return !expiryDate || new Date(expiryDate).getTime() >= now;
    })
    .sort((a, b) => new Date(b.purchaseDate || 0) - new Date(a.purchaseDate || 0))[0];
  if (active) return active;
  if (details.length) return null;
  if (user?.hasBundle) return { purchaseDate: null, expiryDate: null, legacy: true };
  if (user?.purchasedCourses?.some((id) => id.toString() === courseId)) {
    return { purchaseDate: null, expiryDate: null, legacy: true };
  }
  return null;
}

function courseAccessInfo(user, courseOrId) {
  const courseId = (courseOrId?._id || courseOrId)?.toString();
  const details = user?.purchasedCourseDetails || [];
  const rows = details
    .filter((entry) => (entry.course?._id || entry.course)?.toString() === courseId)
    .sort((a, b) => new Date(b.purchaseDate || 0) - new Date(a.purchaseDate || 0));
  const active = activeCourseAccess(user, courseOrId);
  const latest = active || rows[0] || null;
  const expiryDate = effectiveExpiry(latest, courseOrId);
  const expired = Boolean(latest && expiryDate && new Date(expiryDate).getTime() < Date.now());
  const daysRemaining = active?.expiryDate
    ? Math.max(0, Math.ceil((new Date(active.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;
  return {
    isOwned: Boolean(active),
    isExpired: expired && !active,
    purchaseDate: latest?.purchaseDate || null,
    expiryDate,
    daysRemaining,
  };
}

function ownsCourse(user, course) {
  if (!course) return false;
  return Boolean(activeCourseAccess(user, course));
}

function canWatchVideo(user, video) {
  if (!video) return false;
  if (video.isFreePreview) return true;
  return ownsCourse(user, video.course);
}

module.exports = { activeCourseAccess, courseAccessInfo, ownsCourse, canWatchVideo };
