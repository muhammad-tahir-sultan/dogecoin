import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  user: mongoose.Types.ObjectId;
  type: 'deposit' | 'withdrawal' | 'daily_commission' | 'referral_commission';
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  walletAddress?: string; // for deposits/withdrawals
  paymentScreenshotUrl?: string; // for deposits
  referenceLevel?: mongoose.Types.ObjectId; // if related to a specific level
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
      type: String, 
      enum: ['deposit', 'withdrawal', 'daily_commission', 'referral_commission'], 
      required: true 
    },
    amount: { type: Number, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected', 'completed'], 
      default: 'pending' 
    },
    walletAddress: { type: String },
    paymentScreenshotUrl: { type: String },
    referenceLevel: { type: Schema.Types.ObjectId, ref: 'InvestmentLevel' },
  },
  { timestamps: true }
);

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
