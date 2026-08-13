import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { requestDoctorAccessSchema } from '../validators/accessValidator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getPatientDiscoveryStats,
  getDoctorAssignmentStats,
  requestDoctorAccess,
  getPatientDoctorAccessList,
  getDoctorPatientAccessRequests,
  acceptPatientAccessRequest,
  rejectPatientAccessRequest,
  revokeDoctorAccess,
  getDoctorsList,
  getPatientsList,
} from '../controllers/access.js';

const router = express.Router();

router.get('/patient/discovery-stats', authenticateToken, asyncHandler(getPatientDiscoveryStats));
router.get('/doctor/assignment-stats', authenticateToken, asyncHandler(getDoctorAssignmentStats));
router.post('/patient/doctor-access', authenticateToken, validate(requestDoctorAccessSchema), asyncHandler(requestDoctorAccess));
router.get('/patient/doctor-access', authenticateToken, asyncHandler(getPatientDoctorAccessList));
router.get('/doctor/patient-access-requests', authenticateToken, asyncHandler(getDoctorPatientAccessRequests));
router.post('/doctor/patient-access-requests/:request_id/accept', authenticateToken, asyncHandler(acceptPatientAccessRequest));
router.post('/doctor/patient-access-requests/:request_id/reject', authenticateToken, asyncHandler(rejectPatientAccessRequest));
router.post('/patient/doctor-access/:request_id/revoke', authenticateToken, asyncHandler(revokeDoctorAccess));
router.get('/doctors', authenticateToken, asyncHandler(getDoctorsList));
router.get('/users/patients', authenticateToken, asyncHandler(getPatientsList));

export default router;
