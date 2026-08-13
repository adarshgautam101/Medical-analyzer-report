import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getLabValues } from '../controllers/labValues.js';

const router = express.Router();

router.get('/', authenticateToken, asyncHandler(getLabValues));

export default router;
