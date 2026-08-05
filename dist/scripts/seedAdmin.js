"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../config/db"));
const User_1 = __importDefault(require("../models/User"));
dotenv_1.default.config();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@dogecoin.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Dogecoin@Admin123';
const generateReferralCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
async function seedAdmin() {
    await (0, db_1.default)();
    const existing = await User_1.default.findOne({ email: ADMIN_EMAIL });
    if (existing) {
        if (existing.role !== 'admin') {
            existing.role = 'admin';
            await existing.save();
            console.log(`Updated ${ADMIN_EMAIL} to admin role.`);
        }
        else {
            console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
        }
        process.exit(0);
    }
    const salt = await bcryptjs_1.default.genSalt(10);
    const passwordHash = await bcryptjs_1.default.hash(ADMIN_PASSWORD, salt);
    await User_1.default.create({
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
