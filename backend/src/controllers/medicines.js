import * as medicinesService from '../services/medicinesService.js';
import { sendSuccess } from '../utils/response.js';

export const createMedicine = async (req, res) => {
  const result = await medicinesService.createMedicine(req.user, req.body);
  return res.json(result);
};

export const getMedicines = async (req, res) => {
  const result = await medicinesService.getMedicines(req.user);
  return res.json(result);
};

export const updateMedicine = async (req, res) => {
  const result = await medicinesService.updateMedicine(req.user, req.params.medicine_id, req.body);
  return res.json(result);
};

export const deleteMedicine = async (req, res) => {
  const result = await medicinesService.deleteMedicine(req.user, req.params.medicine_id);
  return res.json(result);
};
