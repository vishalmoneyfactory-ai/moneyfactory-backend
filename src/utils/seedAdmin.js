require('dotenv').config();

const bcrypt = require('bcrypt');
const connectDb = require('../config/db');
const User = require('../models/User');

async function run() {
  await connectDb();
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await User.findOneAndUpdate(
    { email },
    { email, name: 'Money Factory Admin', role: 'admin', passwordHash, isActive: true },
    { upsert: true, new: true }
  );
  console.log(`Admin ready: ${admin.email}`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
