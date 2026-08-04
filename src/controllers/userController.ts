import { Request, Response } from 'express';
import User from '../models/User';
import InvestmentLevel from '../models/InvestmentLevel';
import UserLevel from '../models/UserLevel';
import Transaction from '../models/Transaction';

// The request should have req.user from the protect middleware
interface AuthRequest extends Request {
  user?: any;
}

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Get Active Level
    const activeLevelRecord = await UserLevel.findOne({ user: user._id, status: 'active' }).populate('level');
    const allLevels = await InvestmentLevel.find().sort({ levelNumber: 1 });

    // Calculate today's commissions (Simplified)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayDailyCommissions = await Transaction.aggregate([
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

    const todayTeamCommissions = await Transaction.aggregate([
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTeamStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Find all users who were referred by this user
    const teamMembers = await User.find({ referredBy: user.referralCode }).select('-passwordHash');

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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
