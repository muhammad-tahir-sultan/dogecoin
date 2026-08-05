"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactionHistory = exports.claimCommission = exports.requestWithdrawal = exports.submitDeposit = exports.getDepositAddress = void 0;
const Transaction_1 = __importDefault(require("../models/Transaction"));
const Config_1 = __importDefault(require("../models/Config"));
const User_1 = __importDefault(require("../models/User"));
const UserLevel_1 = __importDefault(require("../models/UserLevel"));
const getDepositAddress = async (req, res) => {
    try {
        const config = await Config_1.default.findOne();
        if (!config) {
            res.status(404).json({ message: 'Configuration not found' });
            return;
        }
        res.json({
            address: config.depositWalletAddress,
            qrCodeUrl: config.depositQrCodeUrl
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getDepositAddress = getDepositAddress;
const submitDeposit = async (req, res) => {
    const { amount, referenceLevel, paymentScreenshotUrl } = req.body;
    if (!amount || !paymentScreenshotUrl) {
        res.status(400).json({ message: 'Amount and payment screenshot are required' });
        return;
    }
    try {
        const transaction = await Transaction_1.default.create({
            user: req.user.id,
            type: 'deposit',
            amount,
            status: 'pending',
            paymentScreenshotUrl,
            referenceLevel, // optional level user intends to activate
        });
        res.status(201).json(transaction);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.submitDeposit = submitDeposit;
const requestWithdrawal = async (req, res) => {
    const { amount, walletAddress } = req.body;
    if (!amount || !walletAddress) {
        res.status(400).json({ message: 'Amount and wallet address are required' });
        return;
    }
    try {
        const user = await User_1.default.findById(req.user.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (user.balance < amount) {
            res.status(400).json({ message: 'Insufficient balance' });
            return;
        }
        // Reserve balance
        user.balance -= amount;
        await user.save();
        const transaction = await Transaction_1.default.create({
            user: req.user.id,
            type: 'withdrawal',
            amount,
            walletAddress,
            status: 'pending',
        });
        res.status(201).json(transaction);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.requestWithdrawal = requestWithdrawal;
const claimCommission = async (req, res) => {
    const { type } = req.body; // 'daily' or 'referral'
    try {
        const user = await User_1.default.findById(req.user.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (type === 'daily') {
            const activeLevelRecord = await UserLevel_1.default.findOne({ user: user._id, status: 'active' }).populate('level');
            if (!activeLevelRecord) {
                res.status(400).json({ message: 'No active investment level' });
                return;
            }
            const level = activeLevelRecord.level;
            // In a real app, calculate exact amount based on deposit. For now, use minDeposit * percentage
            const commissionAmount = level.minDeposit * (level.dailyCommissionPercent / 100);
            // Check if already claimed today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const existingClaim = await Transaction_1.default.findOne({
                user: user._id,
                type: 'daily_commission',
                createdAt: { $gte: today },
            });
            if (existingClaim) {
                res.status(400).json({ message: 'Daily commission already claimed today' });
                return;
            }
            user.balance += commissionAmount;
            await user.save();
            const transaction = await Transaction_1.default.create({
                user: user._id,
                type: 'daily_commission',
                amount: commissionAmount,
                status: 'completed',
                referenceLevel: level._id,
            });
            res.status(200).json(transaction);
        }
        else if (type === 'referral') {
            // Simplified: Just an example logic for referral claim
            const commissionAmount = user.referralBonus; // assuming accumulated bonus
            if (commissionAmount <= 0) {
                res.status(400).json({ message: 'No referral commission to claim' });
                return;
            }
            user.balance += commissionAmount;
            user.referralBonus = 0; // reset after claim
            await user.save();
            const transaction = await Transaction_1.default.create({
                user: user._id,
                type: 'referral_commission',
                amount: commissionAmount,
                status: 'completed',
            });
            res.status(200).json(transaction);
        }
        else {
            res.status(400).json({ message: 'Invalid commission type' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.claimCommission = claimCommission;
const getTransactionHistory = async (req, res) => {
    try {
        const transactions = await Transaction_1.default.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(transactions);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getTransactionHistory = getTransactionHistory;
