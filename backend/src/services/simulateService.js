import { Report, LabValue } from '../models/index.js';
import { NotFoundError } from '../errors/AppError.js';

const calculateVelocity = (flowRate, diameter) => {
  const area = Math.PI * Math.pow(diameter / 2, 2);
  return flowRate / area;
};

const calculateRisk = (blockagePercent) => {
  if (blockagePercent < 30) {
    return 'Low';
  } else if (blockagePercent < 70) {
    return 'Medium';
  } else {
    return 'High';
  }
};

export const runSimulation = async (reportId) => {
  const report = await Report.findById(reportId);
  if (!report) {
    throw new NotFoundError('Report not found');
  }

  const labValues = await LabValue.find({ report: reportId });

  let cholesterol = 200;
  let bp = 120;

  for (const lv of labValues) {
    const name = lv.parameterName.toLowerCase();
    if (name.includes('cholesterol')) {
      cholesterol = lv.value;
    }
    if (name.includes('blood pressure')) {
      bp = lv.value;
    }
  }

  const blockage = Math.min((cholesterol / 300) * 100, 90);

  const baseDiameter = 4; 
  const reducedDiameter = baseDiameter * (1 - blockage / 100);
  const velocity = calculateVelocity(5, reducedDiameter);
  const risk = calculateRisk(blockage);

  return {
    blockage,
    diameter: reducedDiameter,
    velocity,
    risk,
  };
};
