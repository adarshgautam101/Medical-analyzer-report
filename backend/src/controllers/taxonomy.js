import * as taxonomyService from '../services/taxonomyService.js';

export const getDoctorCategories = async (req, res) => {
  const result = await taxonomyService.getDoctorCategories();
  return res.json(result);
};

export const getDoctorSpecialties = async (req, res) => {
  const result = await taxonomyService.getDoctorSpecialties(req.query.category_id);
  return res.json(result);
};

export const createDoctorSpecialty = async (req, res) => {
  const result = await taxonomyService.createDoctorSpecialty(req.user, req.body);
  return res.json(result);
};

export const getReportCategories = async (req, res) => {
  const result = await taxonomyService.getReportCategories();
  return res.json(result);
};
