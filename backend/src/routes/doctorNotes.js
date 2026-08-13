import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createDoctorNoteSchema } from '../validators/doctorNoteValidator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createDoctorNote, getDoctorNotes } from '../controllers/doctorNotes.js';

const router = express.Router();

router.post('/', authenticateToken, validate(createDoctorNoteSchema), asyncHandler(createDoctorNote));
router.get('/', authenticateToken, asyncHandler(getDoctorNotes));

export default router;
