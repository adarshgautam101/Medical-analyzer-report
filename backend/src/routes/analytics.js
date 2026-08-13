import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getTrendChart,
  getComparisonChart,
  getHealthSummaryChart,
  getCorrelationChart,
  getHealthSummaryJson,
  getCorrelationJson,
  getPatientAiChat,
} from '../controllers/analytics.js';

const router = express.Router();

router.get('/trend/:parameter_name', authenticateToken, asyncHandler(getTrendChart));
router.get('/comparison', authenticateToken, asyncHandler(getComparisonChart));


router.get('/health-summary/chart', authenticateToken, asyncHandler(getHealthSummaryChart));
router.get('/correlation/chart', authenticateToken, asyncHandler(getCorrelationChart));
router.get('/health-summary', authenticateToken, asyncHandler(getHealthSummaryChart));
router.get('/correlation', authenticateToken, asyncHandler(getCorrelationChart));


router.get('/health-summary-json', authenticateToken, asyncHandler(getHealthSummaryJson));
router.get('/correlation-json', authenticateToken, asyncHandler(getCorrelationJson));

router.post('/patients/:patientId/ai-chat', authenticateToken, requireRole('doctor'), asyncHandler(getPatientAiChat));

export default router;
