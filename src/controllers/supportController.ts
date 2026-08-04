import { Request, Response } from 'express';
import SupportTicket from '../models/SupportTicket';

interface AuthRequest extends Request {
  user?: any;
}

export const getTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tickets = await SupportTicket.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  const { subject, message } = req.body;

  if (!subject || !message) {
    res.status(400).json({ message: 'Subject and message are required' });
    return;
  }

  try {
    const ticket = await SupportTicket.create({
      user: req.user.id,
      subject,
      message,
      status: 'open',
    });

    res.status(201).json(ticket);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
