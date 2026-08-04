import mongoose, { Schema, Document } from 'mongoose';

export interface IUserLevel extends Document {
  user: mongoose.Types.ObjectId;
  level: mongoose.Types.ObjectId;
  status: 'active' | 'expired';
  activatedAt: Date;
  lastClaimedAt?: Date;
}

const UserLevelSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    level: { type: Schema.Types.ObjectId, ref: 'InvestmentLevel', required: true },
    status: { type: String, enum: ['active', 'expired'], default: 'active' },
    activatedAt: { type: Date, default: Date.now },
    lastClaimedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IUserLevel>('UserLevel', UserLevelSchema);
