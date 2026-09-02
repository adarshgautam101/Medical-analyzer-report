import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  uploadReport,
  getReports,
  getSummary,
  getReportDetails,
  deleteReport,
} from '../controllers/reports.js';

const router = express.Router();
const UPLOAD_DIR = 'uploads';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB maximum
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
});

router.post('/upload', authenticateToken, upload.single('file'), asyncHandler(uploadReport));
router.get('/', authenticateToken, asyncHandler(getReports));
router.get('/summary', authenticateToken, asyncHandler(getSummary));
router.get('/:report_id', authenticateToken, asyncHandler(getReportDetails));
router.delete('/:report_id', authenticateToken, asyncHandler(deleteReport));

export default router;
