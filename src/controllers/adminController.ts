import { Request, Response } from 'express';
import Config from '../models/Config';
import SupportTicket from '../models/SupportTicket';
import Transaction from '../models/Transaction';
import User from '../models/User';

export const getAdminStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [users, transactions, supportTickets] = await Promise.all([
      User.find().select('balance totalDeposited totalWithdrawn role'),
      Transaction.find().select('amount type status'),
      SupportTicket.find().select('status'),
    ]);

    res.json({
      totalUsers: users.length,
      adminUsers: users.filter((user) => user.role === 'admin').length,
      totalBalance: users.reduce((total, user: any) => total + (user.balance || 0), 0),
      totalDeposited: users.reduce((total, user: any) => total + (user.totalDeposited || 0), 0),
      totalWithdrawn: users.reduce((total, user: any) => total + (user.totalWithdrawn || 0), 0),
      pendingTransactions: transactions.filter((tx) => tx.status === 'pending').length,
      pendingDeposits: transactions.filter((tx) => tx.type === 'deposit' && tx.status === 'pending').length,
      pendingWithdrawals: transactions.filter((tx) => tx.type === 'withdrawal' && tx.status === 'pending').length,
      openTickets: supportTickets.filter((ticket) => ticket.status === 'open').length,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find()
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAdminUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { balance, role } = req.body;
    const update: Record<string, unknown> = {};

    if (typeof balance === 'number') update.balance = balance;
    if (role === 'admin' || role === 'user') update.role = role;

    const user = await User.findByIdAndUpdate(req.params.userId, update, {
      new: true,
    }).select('-passwordHash');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminTransactions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const transactions = await Transaction.find()
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAdminTransaction = async (req: Request, res: Response): Promise<void> => {
  const { status } = req.body;

  if (status !== 'approved' && status !== 'rejected') {
    res.status(400).json({ message: 'Status must be approved or rejected' });
    return;
  }

  try {
    const transaction: any = await Transaction.findById(req.params.transactionId);

    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    if (transaction.status !== 'pending') {
      res.status(400).json({ message: 'Only pending transactions can be updated' });
      return;
    }

    if (status === 'approved') {
      const user: any = await User.findById(transaction.user);
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
      await User.findByIdAndUpdate(transaction.user, {
        $inc: { balance: transaction.amount },
      });
    }

    transaction.status = status;
    await transaction.save();

    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminSupportTickets = async (_req: Request, res: Response): Promise<void> => {
  try {
    const tickets = await SupportTicket.find()
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAdminSupportTicket = async (req: Request, res: Response): Promise<void> => {
  const { status, adminReply } = req.body;

  if (status !== 'open' && status !== 'resolved' && status !== 'rejected') {
    res.status(400).json({ message: 'Invalid ticket status' });
    return;
  }

  try {
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.ticketId,
      { status, adminReply },
      { new: true },
    );

    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }

    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminConfig = async (_req: Request, res: Response): Promise<void> => {
  try {
    const config = await Config.findOne();
    res.json(config ?? {});
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAdminConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await Config.findOneAndUpdate(
      {},
      {
        depositWalletAddress: req.body.depositWalletAddress ?? '',
        depositQrCodeUrl: req.body.depositQrCodeUrl ?? '',
        whatsappNumber: req.body.whatsappNumber ?? '',
        whatsappVisibility: Boolean(req.body.whatsappVisibility),
      },
      { new: true, upsert: true },
    );

    res.json(config);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
