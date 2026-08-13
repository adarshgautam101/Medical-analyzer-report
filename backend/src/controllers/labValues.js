import * as labValuesService from '../services/labValuesService.js';

export const getLabValues = async (req, res) => {
  const result = await labValuesService.getLabValues(req.user, req.query);
  return res.json(result);
};
