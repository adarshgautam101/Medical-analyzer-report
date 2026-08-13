import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { runSimulation } from '../controllers/simulate.js';

const router = express.Router();

router.post('/:report_id', authenticateToken, asyncHandler(runSimulation));

export default router;
