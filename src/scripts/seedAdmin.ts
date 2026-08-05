import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import connectDB from '../config/db';
import User from '../models/User';

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@dogecoin.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Dogecoin@Admin123';

const generateReferralCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

async function seedAdmin() {
  await connectDB();

  const existing = await User.findOne({ email: ADMIN_EMAIL });

  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log(`Updated ${ADMIN_EMAIL} to admin role.`);
    } else {
      console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
    }
    process.exit(0);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

  await User.create({
    fullName: 'Admin',
    email: ADMIN_EMAIL,
    passwordHash,
    role: 'admin',
    referralCode: generateReferralCode(),
  });

  console.log('Admin user created successfully.');
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error('Failed to seed admin user:', error.message);
  process.exit(1);
});
