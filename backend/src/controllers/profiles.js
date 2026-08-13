import * as profilesService from '../services/profilesService.js';

export const getDoctorProfile = async (req, res) => {
  const result = await profilesService.getDoctorProfile(req.user);
  return res.json(result);
};

export const createDoctorProfile = async (req, res) => {
  const result = await profilesService.createDoctorProfile(req.user, req.body);
  return res.json(result);
};

export const updateDoctorProfile = async (req, res) => {
  const result = await profilesService.updateDoctorProfile(req.user, req.body);
  return res.json(result);
};

export const getPatientProfile = async (req, res) => {
  const result = await profilesService.getPatientProfile(req.user);
  return res.json(result);
};

export const createPatientProfile = async (req, res) => {
  const result = await profilesService.createPatientProfile(req.user, req.body);
  return res.json(result);
};

export const updatePatientProfile = async (req, res) => {
  const result = await profilesService.updatePatientProfile(req.user, req.body);
  return res.json(result);
};

export const getDoctorStats = async (req, res) => {
  const result = await profilesService.getDoctorStats(req.user);
  return res.json(result);
};

export const getPatientDossier = async (req, res) => {
  const result = await profilesService.getPatientDossier(req.user, req.params.patient_id);
  return res.json(result);
};

export const getPublicDoctorInfo = async (req, res) => {
  const result = await profilesService.getPublicDoctorInfo(req.params.doctor_id);
  return res.json(result);
};
