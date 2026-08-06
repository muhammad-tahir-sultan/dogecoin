import express from 'express';
import {
  getAdminConfig,
  getAdminStats,
  getAdminSupportTickets,
  getAdminTransactions,
  getAdminUsers,
  updateAdminConfig,
  updateAdminSupportTicket,
  updateAdminTransaction,
  updateAdminUser,
} from '../controllers/adminController';
import { adminOnly, protect } from '../middleware/auth';

const router = express.Router();

router.use(protect, adminOnly);

router.get('/stats', getAdminStats);
router.get('/users', getAdminUsers);
router.patch('/users/:userId', updateAdminUser);
router.get('/transactions', getAdminTransactions);
router.patch('/transactions/:transactionId', updateAdminTransaction);
router.get('/support', getAdminSupportTickets);
router.patch('/support/:ticketId', updateAdminSupportTicket);
router.get('/config', getAdminConfig);
router.patch('/config', updateAdminConfig);

export default router;
