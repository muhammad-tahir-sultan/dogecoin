import mongoose, { Schema, Document } from 'mongoose';

export interface IConfig extends Document {
  depositWalletAddress: string;
  depositQrCodeUrl: string;
  whatsappNumber: string;
  whatsappVisibility: boolean;
}

const ConfigSchema: Schema = new Schema(
  {
    depositWalletAddress: { type: String, default: '' },
    depositQrCodeUrl: { type: String, default: '' },
    whatsappNumber: { type: String, default: '' },
    whatsappVisibility: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IConfig>('Config', ConfigSchema);
