import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getDashboardData } from '../controllers/dashboard.js';

const router = express.Router();

router.get('/', authenticateToken, asyncHandler(getDashboardData));

export default router;
