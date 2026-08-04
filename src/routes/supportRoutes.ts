import express from 'express';
import { getTickets, createTicket } from '../controllers/supportController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.route('/')
  .get(protect, getTickets)
  .post(protect, createTicket);

export default router;
