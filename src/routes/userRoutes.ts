import express from 'express';
import { getDashboard, getTeamStats } from '../controllers/userController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.get('/dashboard', protect, getDashboard);
router.get('/team', protect, getTeamStats);

export default router;
