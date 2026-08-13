import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateDoctorProfileSchema, updatePatientProfileSchema } from '../validators/profileValidator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getDoctorProfile,
  createDoctorProfile,
  updateDoctorProfile,
  getPatientProfile,
  createPatientProfile,
  updatePatientProfile,
  getDoctorStats,
  getPatientDossier,
  getPublicDoctorInfo,
} from '../controllers/profiles.js';

const router = express.Router();

router.get('/doctor/profile', authenticateToken, asyncHandler(getDoctorProfile));
router.post('/doctor/profile', authenticateToken, validate(updateDoctorProfileSchema), asyncHandler(createDoctorProfile));
router.put('/doctor/profile', authenticateToken, validate(updateDoctorProfileSchema), asyncHandler(updateDoctorProfile));

router.get('/patient/profile', authenticateToken, asyncHandler(getPatientProfile));
router.post('/patient/profile', authenticateToken, validate(updatePatientProfileSchema), asyncHandler(createPatientProfile));
router.put('/patient/profile', authenticateToken, validate(updatePatientProfileSchema), asyncHandler(updatePatientProfile));

router.get('/doctor/statistics', authenticateToken, asyncHandler(getDoctorStats));
router.get('/doctor/patient/:patient_id', authenticateToken, asyncHandler(getPatientDossier));
router.get('/doctor/public/:doctor_id', authenticateToken, asyncHandler(getPublicDoctorInfo));

export default router;
