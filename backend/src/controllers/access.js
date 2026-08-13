import * as accessService from '../services/accessService.js';
import { sendSuccess } from '../utils/response.js';

export const getPatientDiscoveryStats = async (req, res) => {
  const result = await accessService.getPatientDiscoveryStats(req.user);
  return res.json(result);
};

export const getDoctorAssignmentStats = async (req, res) => {
  const result = await accessService.getDoctorAssignmentStats(req.user);
  return res.json(result);
};

export const requestDoctorAccess = async (req, res) => {
  const result = await accessService.requestDoctorAccess(req.user, req.body.doctor_id);
  return res.json(result);
};

export const getPatientDoctorAccessList = async (req, res) => {
  const result = await accessService.getPatientDoctorAccessList(req.user);
  return res.json(result);
};

export const getDoctorPatientAccessRequests = async (req, res) => {
  const result = await accessService.getDoctorPatientAccessRequests(req.user, req.query.status);
  return res.json(result);
};

export const acceptPatientAccessRequest = async (req, res) => {
  const result = await accessService.acceptPatientAccessRequest(req.user, req.params.request_id);
  return res.json(result);
};

export const rejectPatientAccessRequest = async (req, res) => {
  const result = await accessService.rejectPatientAccessRequest(req.user, req.params.request_id);
  return res.json(result);
};

export const revokeDoctorAccess = async (req, res) => {
  const result = await accessService.revokeDoctorAccess(req.user, req.params.request_id);
  return res.json(result);
};

export const getDoctorsList = async (req, res) => {
  const result = await accessService.getDoctorsList(req.query);
  return res.json(result);
};

export const getPatientsList = async (req, res) => {
  const result = await accessService.getPatientsList(req.user, req.query.search);
  return res.json(result);
};
