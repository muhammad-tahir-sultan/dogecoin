import { Request, Response } from 'express';
import User from '../models/User';
import InvestmentLevel from '../models/InvestmentLevel';
import UserLevel from '../models/UserLevel';
import Transaction from '../models/Transaction';

const TEAM_ROLES = [
  { title: 'Leader', salary: 100, requiredMembers: 20, requiredDeposits: 10000 },
  { title: 'Manager', salary: 300, requiredMembers: 50, requiredDeposits: 350000 },
  { title: 'Senior Manager', salary: 500, requiredMembers: 80, requiredDeposits: 70000 },
  { title: 'Director', salary: 1000, requiredMembers: 150, requiredDeposits: 150000 },
];

const getReferralCommissionRate = (depositAmount: number): number => {
  if (depositAmount >= 1000) {
    return 5;
  }

  if (depositAmount >= 200) {
    return 3.5;
  }

  if (depositAmount >= 10) {
    return 2;
  }

  return 0;
};

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

    const activeLevelRecord = await UserLevel.findOne({ user: user._id, status: 'active' }).populate('level');
    const allLevels = await InvestmentLevel.find().sort({ levelNumber: 1 });
    const teamMembers = await User.find({ referredBy: user.referralCode }).select('totalDeposited');
    const availableTeamCommission = teamMembers.reduce((total, member: any) => {
      const rate = getReferralCommissionRate(member.totalDeposited || 0);
      return total + ((member.totalDeposited || 0) * (rate / 100));
    }, 0);
    const dailyCommissionPercent = getReferralCommissionRate(user.totalDeposited || 0);

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
        totalTeamCommission: availableTeamCommission,
        dailyCommissionPercent,
        estimatedDailyCommission: user.totalDeposited * (dailyCommissionPercent / 100),
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

    const roles = TEAM_ROLES.map(role => {
      const memberProgress = Math.min(teamMembers.length / role.requiredMembers, 1);
      const depositProgress = Math.min(teamDeposits / role.requiredDeposits, 1);
      const progress = Math.min(memberProgress, depositProgress);

      return {
        ...role,
        currentMembers: teamMembers.length,
        currentDeposits: teamDeposits,
        remainingMembers: Math.max(role.requiredMembers - teamMembers.length, 0),
        remainingDeposits: Math.max(role.requiredDeposits - teamDeposits, 0),
        progress,
        achieved: progress >= 1,
      };
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
      roles,
      members: teamMembers,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
