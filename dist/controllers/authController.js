"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.signup = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const generateToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '30d',
    });
};
const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};
const signup = async (req, res) => {
    const { fullName, email, password, referralCode } = req.body;
    try {
        const userExists = await User_1.default.findOne({ email });
        if (userExists) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        let referredBy = undefined;
        if (referralCode) {
            const referrer = await User_1.default.findOne({ referralCode });
            if (referrer) {
                referredBy = referrer.referralCode;
            }
        }
        const user = await User_1.default.create({
            fullName,
            email,
            passwordHash,
            referralCode: generateReferralCode(),
            referredBy,
        });
        res.status(201).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            referralCode: user.referralCode,
            token: generateToken(user._id.toString()),
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.signup = signup;
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User_1.default.findOne({ email });
        if (user && (await bcryptjs_1.default.compare(password, user.passwordHash))) {
            res.json({
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                referralCode: user.referralCode,
                token: generateToken(user._id.toString()),
            });
        }
        else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.login = login;
