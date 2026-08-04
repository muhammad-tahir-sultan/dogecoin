import express from 'express';
import { getDepositAddress, submitDeposit, requestWithdrawal, claimCommission, getTransactionHistory } from '../controllers/transactionController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.get('/deposit/address', protect, getDepositAddress);
router.post('/deposit', protect, submitDeposit);
router.post('/withdraw', protect, requestWithdrawal);
router.post('/commission/claim', protect, claimCommission);
router.get('/history', protect, getTransactionHistory);

export default router;
