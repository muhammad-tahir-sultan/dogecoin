import mongoose, { Schema, Document } from 'mongoose';

export interface IInvestmentLevel extends Document {
  levelNumber: number;
  name: string;
  minDeposit: number;
  maxDeposit: number | null; // null if no upper bound
  dailyCommissionPercent: number;
}

const InvestmentLevelSchema: Schema = new Schema(
  {
    levelNumber: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    minDeposit: { type: Number, required: true },
    maxDeposit: { type: Number, default: null },
    dailyCommissionPercent: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IInvestmentLevel>('InvestmentLevel', InvestmentLevelSchema);
