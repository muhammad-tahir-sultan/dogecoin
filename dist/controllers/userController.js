"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamStats = exports.getDashboard = void 0;
const User_1 = __importDefault(require("../models/User"));
const InvestmentLevel_1 = __importDefault(require("../models/InvestmentLevel"));
const UserLevel_1 = __importDefault(require("../models/UserLevel"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const getDashboard = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user.id).select('-passwordHash');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Get Active Level
        const activeLevelRecord = await UserLevel_1.default.findOne({ user: user._id, status: 'active' }).populate('level');
        const allLevels = await InvestmentLevel_1.default.find().sort({ levelNumber: 1 });
        // Calculate today's commissions (Simplified)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayDailyCommissions = await Transaction_1.default.aggregate([
            {
                $match: {
                    user: user._id,
                    type: 'daily_commission',
                    createdAt: { $gte: today },
                    status: 'completed'
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const todayTeamCommissions = await Transaction_1.default.aggregate([
            {
                $match: {
                    user: user._id,
                    type: 'referral_commission',
                    createdAt: { $gte: today },
                    status: 'completed'
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        res.json({
            wallet: {
                availableBalance: user.balance,
                totalDeposited: user.totalDeposited,
                totalWithdrawn: user.totalWithdrawn,
                todayDailyCommission: todayDailyCommissions.length > 0 ? todayDailyCommissions[0].total : 0,
                todayTeamCommission: todayTeamCommissions.length > 0 ? todayTeamCommissions[0].total : 0,
                totalTeamCommission: user.referralBonus,
            },
            activeLevel: activeLevelRecord ? activeLevelRecord.level : null,
            levels: allLevels,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getDashboard = getDashboard;
const getTeamStats = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Find all users who were referred by this user
        const teamMembers = await User_1.default.find({ referredBy: user.referralCode }).select('-passwordHash');
        let teamDeposits = 0;
        let teamWithdrawals = 0;
        let teamBalance = 0;
        teamMembers.forEach(member => {
            teamDeposits += member.totalDeposited;
            teamWithdrawals += member.totalWithdrawn;
            teamBalance += member.balance;
        });
        res.json({
            referralCode: user.referralCode,
            referralLink: `https://rivochain.com/signup?ref=${user.referralCode}`, // Example link
            stats: {
                totalMembers: teamMembers.length,
                teamDeposits,
                teamWithdrawals,
                teamBalance,
            },
            members: teamMembers,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getTeamStats = getTeamStats;
