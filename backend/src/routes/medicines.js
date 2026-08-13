import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createMedicineSchema, updateMedicineSchema } from '../validators/medicineValidator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createMedicine,
  getMedicines,
  updateMedicine,
  deleteMedicine,
} from '../controllers/medicines.js';

const router = express.Router();

router.post('/', authenticateToken, validate(createMedicineSchema), asyncHandler(createMedicine));
router.get('/', authenticateToken, asyncHandler(getMedicines));
router.put('/:medicine_id', authenticateToken, validate(updateMedicineSchema), asyncHandler(updateMedicine));
router.delete('/:medicine_id', authenticateToken, asyncHandler(deleteMedicine));

export default router;
