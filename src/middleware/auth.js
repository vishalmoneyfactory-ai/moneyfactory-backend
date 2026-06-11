const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) return res.status(401).json({ message: 'Unauthorized' });
    user.lastActiveAt = new Date();
    await user.save();
    req.user = user;
    return next();
  } catch (_err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

async function optionalToken(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (user?.isActive) {
      user.lastActiveAt = new Date();
      await user.save();
      req.user = user;
    }
  } catch (_err) {
    // Public routes should still work when an optional token is absent or stale.
  }
  return next();
}

module.exports = { verifyToken, optionalToken };
