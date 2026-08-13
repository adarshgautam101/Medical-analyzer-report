import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createDoctorSpecialtySchema } from '../validators/taxonomyValidator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getDoctorCategories,
  getDoctorSpecialties,
  createDoctorSpecialty,
  getReportCategories,
} from '../controllers/taxonomy.js';

const router = express.Router();

router.get('/doctor-categories', asyncHandler(getDoctorCategories));
router.get('/categories', asyncHandler(getDoctorCategories));

router.get('/doctor-specialties', asyncHandler(getDoctorSpecialties));
router.get('/specialties', asyncHandler(getDoctorSpecialties));

router.post('/doctor-specialties', authenticateToken, validate(createDoctorSpecialtySchema), asyncHandler(createDoctorSpecialty));
router.post('/specialties', authenticateToken, validate(createDoctorSpecialtySchema), asyncHandler(createDoctorSpecialty));

router.get('/report-categories', asyncHandler(getReportCategories));

export default router;
