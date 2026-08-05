import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import transactionRoutes from './routes/transactionRoutes';
import supportRoutes from './routes/supportRoutes';
import uploadRoutes from './routes/uploadRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure DB is connected before handling any request (required for Vercel serverless)
app.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error: any) {
    console.error('Database connection failed:', error.message);
    res.status(503).json({ message: 'Database connection failed. Please try again.' });
  }
});

// Routes
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/upload', uploadRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('RivoChain Mobile Backend API');
});

// Start Server only if not in Vercel environment
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
