import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
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

function verifyLegacySha256Password(password: string, storedHash: string) {
  const saltLength = 32;
  if (!storedHash || storedHash.length !== 64 || storedHash.slice(0, saltLength).trim() === storedHash.slice(0, saltLength)) {
    return false;
  }

  const salt = storedHash.slice(0, saltLength);
  const digest = createHash('sha256').update(`${salt}${password}`).digest('hex');
  return digest === storedHash.slice(saltLength);
}

function isLikelyBcryptHash(hash: string) {
  return hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$');
}

async function upgradePasswordHash(user: any, password: string) {
  const newHash = await bcrypt.hash(password, 10);
  user.passwordHash = newHash;
  await user.save();
}

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

    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    let passwordValid = false;
    const storedHash = user.passwordHash;

    if (isLikelyBcryptHash(storedHash)) {
      passwordValid = await bcrypt.compare(password, storedHash);
    } else {
      passwordValid = verifyLegacySha256Password(password, storedHash);

      if (passwordValid) {
        await upgradePasswordHash(user, password);
      }
    }

    if (passwordValid) {
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
