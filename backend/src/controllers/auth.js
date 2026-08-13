import * as authService from '../services/authService.js';
import { sendSuccess } from '../utils/response.js';

export const register = async (req, res) => {
  const result = await authService.registerUser(req.body);
  return res.json(result);
};

export const login = async (req, res) => {
  const result = await authService.loginUser(req.body);
  return res.json(result);
};
