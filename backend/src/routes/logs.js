import { Router } from 'express';
import {
  logFrontendEvent,
  getLogsSummaryController,
  getLogEntriesController,
  downloadLogFileController,
  clearLogFileController,
} from '../controllers/logs.js';

const router = Router();

router.post('/', logFrontendEvent);
router.get('/summary', getLogsSummaryController);
router.get('/entries', getLogEntriesController);
router.get('/download/:fileName', downloadLogFileController);
router.delete('/:fileName', clearLogFileController);

export default router;

