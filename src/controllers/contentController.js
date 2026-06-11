const AppSetting = require('../models/AppSetting');
const Banner = require('../models/Banner');
const LegalPage = require('../models/LegalPage');
const Media = require('../models/Media');
const { uploadImageToCloudinary } = require('../config/cloudinary');

const defaultCompany = {
  description: 'Money Factory is a premium trading education platform focused on practical market structure, liquidity, and indicator-led execution.',
  mission: 'Help students build disciplined trading skill with structured education.',
  vision: 'Make high-quality trading education accessible from a secure mobile platform.',
  supportEmail: 'support@moneyfactory.com',
  supportPhone: '',
  whatsapp: '',
  socialLinks: {},
  maintenanceMode: false,
};

async function settings(_req, res) {
  const rows = await AppSetting.find();
  const data = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return res.json({ settings: { company: { ...defaultCompany, ...(data.company || {}) }, bundlePrice: data.bundlePrice || 4999, maintenanceMode: data.maintenanceMode || false } });
}

async function updateSettings(req, res) {
  const entries = Object.entries(req.body);
  await Promise.all(entries.map(([key, value]) => AppSetting.findOneAndUpdate({ key }, { value }, { upsert: true })));
  return settings(req, res);
}

async function listBanners(req, res) {
  const filter = req.user?.role === 'admin' ? {} : { isActive: true };
  const banners = await Banner.find(filter).sort({ order: 1 });
  return res.json({ banners });
}

async function createBanner(req, res) {
  const banner = await Banner.create(req.body);
  return res.status(201).json({ banner });
}

async function updateBanner(req, res) {
  const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!banner) return res.status(404).json({ message: 'Banner not found' });
  return res.json({ banner });
}

async function deleteBanner(req, res) {
  const banner = await Banner.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!banner) return res.status(404).json({ message: 'Banner not found' });
  return res.json({ banner });
}

async function listLegal(req, res) {
  const filter = req.user?.role === 'admin' ? {} : { isActive: true };
  const pages = await LegalPage.find(filter).sort({ slug: 1 });
  return res.json({ pages });
}

async function updateLegal(req, res) {
  const page = await LegalPage.findOneAndUpdate({ slug: req.params.slug }, req.body, { upsert: true, new: true });
  return res.json({ page });
}

async function uploadMedia(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Image is required' });
  const uploaded = await uploadImageToCloudinary(req.file, 'course-and-banner-images');
  const media = await Media.create({
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url: uploaded.url,
    provider: 'cloudinary',
    publicId: uploaded.publicId,
    uploadedBy: req.user._id,
  });
  return res.status(201).json({ url: uploaded.url, media: { id: media._id, filename: media.filename, size: media.size, publicId: media.publicId } });
}

async function getMedia(req, res) {
  const media = await Media.findById(req.params.id);
  if (!media) return res.status(404).json({ message: 'Media not found' });
  if (media.url) return res.redirect(media.url);
  res.header('Content-Type', media.mimeType);
  res.header('Cache-Control', 'public, max-age=31536000');
  return res.send(media.data);
}

module.exports = { settings, updateSettings, listBanners, createBanner, updateBanner, deleteBanner, listLegal, updateLegal, uploadMedia, getMedia };
