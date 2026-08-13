import { Router } from 'express';
import { logFrontendEvent } from '../controllers/logs.js';

const router = Router();

router.post('/', logFrontendEvent);

export default router;
