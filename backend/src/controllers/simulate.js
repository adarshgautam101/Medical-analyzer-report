import * as simulateService from '../services/simulateService.js';

export const runSimulation = async (req, res) => {
  const result = await simulateService.runSimulation(req.params.report_id);
  return res.json(result);
};
