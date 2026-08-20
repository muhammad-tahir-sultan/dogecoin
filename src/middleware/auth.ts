import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface AuthRequest extends Request {
  user?: string | jwt.JwtPayload;
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction): void => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      req.user = decoded;
      next();
      return;
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
      return;
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
    return;
  }
};

export const adminOnly = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = typeof req.user === 'object' ? req.user.id : undefined;
    const user = userId ? await User.findById(userId) : null;

    if (!user || user.role !== 'admin') {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    next();
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Admin check failed' });
  }
};
