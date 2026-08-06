import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const dropLegacyIdIndex = async () => {
  try {
    await User.collection.dropIndex('id_1');
    console.log('Dropped legacy users.id_1 index');
  } catch (error: any) {
    if (error?.codeName !== 'IndexNotFound' && error?.code !== 27) {
      throw error;
    }
  }
};

const createUser = async (userData: {
  fullName: string;
  email: string;
  passwordHash: string;
  referralCode: string;
  referredBy?: string;
}) => {
  try {
    return await User.create(userData);
  } catch (error: any) {
    if (error?.code === 11000 && error?.keyPattern?.id) {
      await dropLegacyIdIndex();
      return User.create(userData);
    }

    throw error;
  }
};

export const signup = async (req: Request, res: Response): Promise<void> => {
  const { fullName, email, password, referralCode } = req.body;

  try {
    await dropLegacyIdIndex();

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    let referredBy: string | undefined = undefined;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        referredBy = referrer.referralCode;
      }
    }

    const user = await createUser({
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
      role: user.role,
      referralCode: user.referralCode,
      token: generateToken(user._id.toString()),
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    res.status(500).json({ message: 'Unable to create account. Please try again.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      res.json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        token: generateToken(user._id.toString()),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
