import mongoose, { Schema, Document } from 'mongoose';

export interface ISupportTicket extends Document {
  user: mongoose.Types.ObjectId;
  subject: string;
  message: string;
  screenshotUrl?: string;
  status: 'open' | 'resolved' | 'rejected';
  adminReply?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    screenshotUrl: { type: String },
    status: { 
      type: String, 
      enum: ['open', 'resolved', 'rejected'], 
      default: 'open' 
    },
    adminReply: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
