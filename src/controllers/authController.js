const bcrypt = require('bcrypt');
const admin = require('../config/firebase');
const User = require('../models/User');
const Media = require('../models/Media');
const { uploadImageToCloudinary } = require('../config/cloudinary');
const generateToken = require('../utils/generateToken');

async function verifyFirebase(req, res) {
  const { idToken, name, phone } = req.body;
  if (!idToken) return res.status(400).json({ message: 'Firebase ID token is required' });
  if (!(admin.apps || []).length) return res.status(500).json({ message: 'Firebase Admin is not configured' });

  const decoded = await admin.auth().verifyIdToken(idToken);
  const email = decoded.email?.toLowerCase();
  if (!email) return res.status(400).json({ message: 'Firebase account must include an email' });

  const existing = await User.findOne({ $or: [{ firebaseUid: decoded.uid }, { email }] });
  if (existing?.role === 'admin') {
    return res.status(403).json({ message: 'Admin accounts can sign in only from the admin portal' });
  }

  const user = await User.findOneAndUpdate(
    { $or: [{ firebaseUid: decoded.uid }, { email }] },
    {
      $setOnInsert: {
        firebaseUid: decoded.uid,
        email,
        role: 'student',
      },
      $set: {
        name: name || decoded.name || email.split('@')[0],
        phone,
        isActive: true,
        lastActiveAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  const token = generateToken(user);
  return res.json({ token, user });
}

async function adminSetupStatus(_req, res) {
  const hasAdmin = await User.exists({ role: 'admin' });
  return res.json({ hasAdmin: Boolean(hasAdmin) });
}

async function createFirstAdmin(req, res) {
  const hasAdmin = await User.exists({ role: 'admin' });
  if (hasAdmin) return res.status(409).json({ message: 'Admin account already exists' });

  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone,
    passwordHash,
    role: 'admin',
    isActive: true,
  });
  const token = generateToken(user, process.env.ADMIN_JWT_EXPIRE || '24h');
  const safeUser = user.toObject();
  delete safeUser.passwordHash;
  return res.status(201).json({ token, user: safeUser });
}

async function adminLogin(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

  const user = await User.findOne({ email: email.toLowerCase(), role: 'admin' }).select('+passwordHash');
  if (!user || !user.passwordHash) return res.status(401).json({ message: 'Invalid credentials' });
  if (!user.isActive) return res.status(401).json({ message: 'Admin account is disabled' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

  const token = generateToken(user, process.env.ADMIN_JWT_EXPIRE || '24h');
  const safeUser = user.toObject();
  delete safeUser.passwordHash;
  return res.json({ token, user: safeUser });
}

async function me(req, res) {
  const user = await User.findById(req.user._id)
    .populate('purchasedCourses', 'title price thumbnail totalVideos totalDuration isFree isBundle');
  return res.json({ user });
}

async function updateMe(req, res) {
  const { name, phone } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (phone !== undefined) update.phone = phone;
  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
  return res.json({ user });
}

async function uploadProfileImage(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Image is required' });
  const uploaded = await uploadImageToCloudinary(req.file, req.user.role === 'admin' ? 'admin-profiles' : 'user-profiles');
  const media = await Media.create({
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url: uploaded.url,
    provider: 'cloudinary',
    publicId: uploaded.publicId,
    uploadedBy: req.user._id,
  });
  const profileImage = uploaded.url;
  const user = await User.findByIdAndUpdate(req.user._id, { profileImage }, { new: true });
  return res.status(201).json({ profileImage, user, media: { id: media._id, publicId: media.publicId } });
}

async function removeProfileImage(req, res) {
  const user = await User.findByIdAndUpdate(req.user._id, { $unset: { profileImage: '' } }, { new: true });
  return res.json({ user });
}

async function updateFcmToken(req, res) {
  const { fcmToken } = req.body;
  await User.findByIdAndUpdate(req.user._id, { fcmToken });
  return res.json({ message: 'FCM token updated' });
}

module.exports = {
  verifyFirebase,
  adminSetupStatus,
  createFirstAdmin,
  adminLogin,
  me,
  updateMe,
  uploadProfileImage,
  removeProfileImage,
  updateFcmToken,
};
