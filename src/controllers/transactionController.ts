import { Request, Response } from 'express';
import Transaction from '../models/Transaction';
import Config from '../models/Config';
import User from '../models/User';
interface AuthRequest extends Request {
  user?: any;
}

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

const getApprovedDepositTotal = async (userId: any): Promise<number> => {
  const approvedDeposits = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        type: 'deposit',
        status: 'approved',
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  return approvedDeposits.length > 0 ? approvedDeposits[0].total : 0;
};

export const getDepositAddress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const config = await Config.findOne();
    if (!config) {
      res.status(404).json({ message: 'Configuration not found' });
      return;
    }

    res.json({
      address: config.depositWalletAddress,
      qrCodeUrl: config.depositQrCodeUrl
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const submitDeposit = async (req: AuthRequest, res: Response): Promise<void> => {
  const { amount, referenceLevel, paymentScreenshotUrl } = req.body;

  if (!amount || !paymentScreenshotUrl) {
    res.status(400).json({ message: 'Amount and payment screenshot are required' });
    return;
  }

  try {
    const transaction = await Transaction.create({
      user: req.user.id,
      type: 'deposit',
      amount,
      status: 'pending',
      paymentScreenshotUrl,
      referenceLevel, // optional level user intends to activate
    });

    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const requestWithdrawal = async (req: AuthRequest, res: Response): Promise<void> => {
  const { amount, walletAddress } = req.body;
  
  if (!amount || !walletAddress) {
    res.status(400).json({ message: 'Amount and wallet address are required' });
    return;
  }

  try {
    const user: any = await User.findById(req.user.id);
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

    const transaction = await Transaction.create({
      user: req.user.id,
      type: 'withdrawal',
      amount,
      walletAddress,
      status: 'pending',
    });

    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const claimCommission = async (req: AuthRequest, res: Response): Promise<void> => {
  const { type } = req.body; // 'daily' or 'referral'

  try {
    const user: any = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (type === 'daily') {
      const approvedDepositTotal = await getApprovedDepositTotal(user._id);
      const commissionBase = approvedDepositTotal || user.totalDeposited;
      const commissionRate = getReferralCommissionRate(commissionBase);

      if (commissionRate <= 0) {
        res.status(400).json({ message: 'Deposit at least $10 to unlock daily commission' });
        return;
      }

      const commissionAmount = commissionBase * (commissionRate / 100);

      // Check if already claimed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingClaim = await Transaction.findOne({
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

      const transaction = await Transaction.create({
        user: user._id,
        type: 'daily_commission',
        amount: commissionAmount,
        status: 'completed',
      });

      res.status(200).json(transaction);
    } else if (type === 'referral') {
      const teamMembers = await User.find({ referredBy: user.referralCode }).select('totalDeposited');
      const commissionAmount = teamMembers.reduce((total, member: any) => {
        return total + ((member.totalDeposited || 0) * (0.5 / 100));
      }, 0);

      if (commissionAmount <= 0) {
        res.status(400).json({ message: 'No referral commission to claim' });
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingClaim = await Transaction.findOne({
        user: user._id,
        type: 'referral_commission',
        createdAt: { $gte: today },
      });

      if (existingClaim) {
        res.status(400).json({ message: 'Referral commission already claimed today' });
        return;
      }

      user.balance += commissionAmount;
      await user.save();

      const transaction = await Transaction.create({
        user: user._id,
        type: 'referral_commission',
        amount: commissionAmount,
        status: 'completed',
      });

      res.status(200).json(transaction);
    } else {
      res.status(400).json({ message: 'Invalid commission type' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTransactionHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
