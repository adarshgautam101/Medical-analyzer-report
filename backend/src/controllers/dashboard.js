import * as dashboardService from '../services/dashboardService.js';

export const getDashboardData = async (req, res) => {
  const result = await dashboardService.getDashboardData(req.user, req.query);
  return res.json(result);
};
