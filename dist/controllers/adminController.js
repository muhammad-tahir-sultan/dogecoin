"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAdminConfig = exports.getAdminConfig = exports.updateAdminSupportTicket = exports.getAdminSupportTickets = exports.updateAdminTransaction = exports.getAdminTransactions = exports.updateAdminUser = exports.getAdminUsers = exports.getAdminStats = void 0;
const Config_1 = __importDefault(require("../models/Config"));
const SupportTicket_1 = __importDefault(require("../models/SupportTicket"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const User_1 = __importDefault(require("../models/User"));
const getAdminStats = async (_req, res) => {
    try {
        const [users, transactions, supportTickets] = await Promise.all([
            User_1.default.find().select('balance totalDeposited totalWithdrawn totalCommission totalReferralBonus role transactions'),
            Transaction_1.default.find().select('amount type status createdAt'),
            SupportTicket_1.default.find().select('status'),
        ]);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayDeposits = transactions.filter(tx => tx.type === 'deposit' && tx.status === 'completed' && tx.createdAt >= today);
        const todayWithdrawals = transactions.filter(tx => tx.type === 'withdrawal' && tx.status === 'completed' && tx.createdAt >= today);
        const todayCommissions = transactions.filter(tx => tx.type === 'daily_commission' && tx.status === 'completed' && tx.createdAt >= today);
        const todayReferralCommissions = transactions.filter(tx => tx.type === 'referral_commission' && tx.status === 'completed' && tx.createdAt >= today);
        const pendingDeposits = transactions.filter(tx => tx.type === 'deposit' && tx.status === 'pending');
        const pendingWithdrawals = transactions.filter(tx => tx.type === 'withdrawal' && tx.status === 'pending');
        res.json({
            totalUsersCount: users.length,
            totalAdminsCount: users.filter(user => user.role === 'admin').length,
            totalBalance: users.reduce((total, user) => total + (user.balance || 0), 0),
            totalDeposited: users.reduce((total, user) => total + (user.totalDeposited || 0), 0),
            totalWithdrawn: users.reduce((total, user) => total + (user.totalWithdrawn || 0), 0),
            totalCommission: users.reduce((total, user) => total + (user.totalCommission || 0), 0),
            totalReferralBonus: users.reduce((total, user) => total + (user.totalReferralBonus || 0), 0),
            todayDeposited: todayDeposits.reduce((sum, tx) => sum + tx.amount, 0),
            todayWithdrawn: todayWithdrawals.reduce((sum, tx) => sum + tx.amount, 0),
            todayCommission: todayCommissions.reduce((sum, tx) => sum + tx.amount, 0),
            todayReferralBonus: todayReferralCommissions.reduce((sum, tx) => sum + tx.amount, 0),
            pendingDepositsCount: pendingDeposits.length,
            pendingWithdrawalsCount: pendingWithdrawals.length,
            pendingDepositsAmount: pendingDeposits.reduce((sum, tx) => sum + tx.amount, 0),
            pendingWithdrawalsAmount: pendingWithdrawals.reduce((sum, tx) => sum + tx.amount, 0),
            openTickets: supportTickets.filter(ticket => ticket.status === 'open').length,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAdminStats = getAdminStats;
const getAdminUsers = async (_req, res) => {
    try {
        const users = await User_1.default.find()
            .select('-passwordHash')
            .sort({ createdAt: -1 });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAdminUsers = getAdminUsers;
const updateAdminUser = async (req, res) => {
    try {
        const { balance, role } = req.body;
        const update = {};
        if (typeof balance === 'number')
            update.balance = balance;
        if (role === 'admin' || role === 'user')
            update.role = role;
        const user = await User_1.default.findByIdAndUpdate(req.params.userId, update, {
            new: true,
        }).select('-passwordHash');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateAdminUser = updateAdminUser;
const getAdminTransactions = async (_req, res) => {
    try {
        const transactions = await Transaction_1.default.find()
            .populate('user', 'fullName email')
            .sort({ createdAt: -1 });
        res.json(transactions);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAdminTransactions = getAdminTransactions;
const updateAdminTransaction = async (req, res) => {
    const { status } = req.body;
    if (status !== 'approved' && status !== 'rejected') {
        res.status(400).json({ message: 'Status must be approved or rejected' });
        return;
    }
    try {
        const transaction = await Transaction_1.default.findById(req.params.transactionId);
        if (!transaction) {
            res.status(404).json({ message: 'Transaction not found' });
            return;
        }
        if (transaction.status !== 'pending') {
            res.status(400).json({ message: 'Only pending transactions can be updated' });
            return;
        }
        if (status === 'approved') {
            const user = await User_1.default.findById(transaction.user);
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }
            if (transaction.type === 'deposit') {
                user.balance += transaction.amount;
                user.totalDeposited += transaction.amount;
            }
            if (transaction.type === 'withdrawal') {
                user.totalWithdrawn += transaction.amount;
            }
            await user.save();
        }
        if (status === 'rejected' && transaction.type === 'withdrawal') {
            await User_1.default.findByIdAndUpdate(transaction.user, {
                $inc: { balance: transaction.amount },
            });
        }
        transaction.status = status;
        await transaction.save();
        res.json(transaction);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateAdminTransaction = updateAdminTransaction;
const getAdminSupportTickets = async (_req, res) => {
    try {
        const tickets = await SupportTicket_1.default.find()
            .populate('user', 'fullName email')
            .sort({ createdAt: -1 });
        res.json(tickets);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAdminSupportTickets = getAdminSupportTickets;
const updateAdminSupportTicket = async (req, res) => {
    const { status, adminReply } = req.body;
    if (status !== 'open' && status !== 'resolved' && status !== 'rejected') {
        res.status(400).json({ message: 'Invalid ticket status' });
        return;
    }
    try {
        const ticket = await SupportTicket_1.default.findByIdAndUpdate(req.params.ticketId, { status, adminReply }, { new: true });
        if (!ticket) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }
        res.json(ticket);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateAdminSupportTicket = updateAdminSupportTicket;
const getAdminConfig = async (_req, res) => {
    try {
        const config = await Config_1.default.findOne();
        res.json(config ?? {});
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAdminConfig = getAdminConfig;
const updateAdminConfig = async (req, res) => {
    try {
        const config = await Config_1.default.findOneAndUpdate({}, {
            depositWalletAddress: req.body.depositWalletAddress ?? '',
            depositQrCodeUrl: req.body.depositQrCodeUrl ?? '',
            whatsappNumber: req.body.whatsappNumber ?? '',
            whatsappVisibility: Boolean(req.body.whatsappVisibility),
        }, { new: true, upsert: true });
        res.json(config);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateAdminConfig = updateAdminConfig;
