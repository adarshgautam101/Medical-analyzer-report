import { Report, LabValue, PatientDoctorAccess } from '../models/index.js';
import { computeSlope } from '../utils/analytics.js';

const RELATIVE_SLOPE_THRESHOLD = 0.10;
const MAX_REPORTS_PER_PARAMETER = 10;

const getTargetPatientIds = async (user) => {
  if (user.role === 'doctor') {
    const approvedAccess = await PatientDoctorAccess.find({
      doctor: user.id,
      status: { $in: ['approved', 'accepted'] },
    });
    return approvedAccess.map((access) => access.patient);
  } else {
    return [user.id];
  }
};

const computeTrend = (values, avg) => {
  if (values.length < 2) return 'Insufficient Data';
  const slope = computeSlope(values);
  const meanVal = avg !== undefined ? avg : (values.reduce((a, b) => a + b, 0) / values.length);
  
  if (meanVal === 0) return 'Stable';
  const relativeSlope = Math.abs(slope) / Math.abs(meanVal);
  
  if (relativeSlope > RELATIVE_SLOPE_THRESHOLD) {
    return slope > 0 ? 'Increasing' : 'Decreasing';
  }
  return 'Stable';
};

const getParameterAnalytics = (paramName, labValues) => {
  if (labValues.length === 0) {
    return {
      parameter: paramName,
      values: [],
      trend: 'No Data',
      avg: null,
      min: null,
      max: null,
      slope: null,
    };
  }

  const series = labValues.map((lv) => {
    const date = lv.report.reportDate || lv.report.uploadDate;
    return {
      date: date.toISOString(),
      value: lv.value,
    };
  });

  const numericVals = labValues.map((lv) => lv.value).filter((v) => v !== null && !isNaN(v));
  if (numericVals.length === 0) {
    return {
      parameter: paramName,
      values: series,
      trend: 'No Valid Data',
      avg: null,
      min: null,
      max: null,
      slope: null,
    };
  }

  const avg = numericVals.reduce((a, b) => a + b, 0) / numericVals.length;
  const min = Math.min(...numericVals);
  const max = Math.max(...numericVals);
  const slope = computeSlope(numericVals);
  const trend = computeTrend(numericVals, avg);

  return {
    parameter: paramName,
    values: series,
    trend,
    avg: Math.round(avg * 100) / 100,
    min,
    max,
    slope: Math.round(slope * 100) / 100,
  };
};

const evaluateRisk = (analytics) => {
  const values = analytics.values || [];
  const trend = analytics.trend;
  const parameter = analytics.parameter;

  if (values.length === 0) {
    return {
      parameter,
      risk_level: 'UNKNOWN',
      confidence: 'LOW',
      reason: 'No data available',
    };
  }

  const latest = values[values.length - 1].value;

  let riskLevel = 'MEDIUM';
  if (trend === 'Increasing') {
    riskLevel = latest > 0 ? 'HIGH' : 'MEDIUM';
  } else if (trend === 'Decreasing' || trend === 'Stable') {
    riskLevel = 'LOW';
  }

  let confidence = 'LOW';
  if (values.length >= 5) {
    confidence = 'HIGH';
  } else if (values.length >= 3) {
    confidence = 'MEDIUM';
  }

  return {
    parameter,
    risk_level: riskLevel,
    confidence,
    reason: `Latest value is ${latest}, trend is ${trend}, classified as ${riskLevel}`,
  };
};

const generateInsights = (analytics, risk) => {
  const parameter = analytics.parameter;
  const trend = analytics.trend;
  const values = analytics.values || [];
  const riskLevel = risk.risk_level;

  if (values.length === 0) {
    return {
      parameter,
      summary: 'No data available.',
      trend_insight: '',
      risk_insight: '',
      recommendation: '',
    };
  }

  const latest = values[values.length - 1].value;
  const summary = `${parameter} is currently ${latest}. The trend is ${trend.toLowerCase()} and overall risk is ${riskLevel.toLowerCase()}.`;

  let trendInsight = 'Values have remained relatively stable.';
  if (values.length >= 2) {
    const first = values[0].value;
    const last = values[values.length - 1].value;
    const change = Math.round((last - first) * 100) / 100;
    if (trend === 'Increasing') {
      trendInsight = `Values have increased by ${change} over time.`;
    } else if (trend === 'Decreasing') {
      trendInsight = `Values have decreased by ${Math.abs(change)} over time.`;
    }
  } else {
    trendInsight = 'Not enough data to determine trend.';
  }

  let riskInsight = 'Risk level could not be determined.';
  if (riskLevel === 'HIGH') {
    riskInsight = 'This parameter is in a high-risk range and may require medical attention.';
  } else if (riskLevel === 'MEDIUM') {
    riskInsight = 'This parameter is borderline and should be monitored closely.';
  } else if (riskLevel === 'LOW') {
    riskInsight = 'This parameter is within a safe range.';
  }

  let recommendation = 'Maintain current lifestyle and periodic monitoring.';
  if (riskLevel === 'HIGH') {
    recommendation = 'Consult a doctor and consider further diagnostic tests.';
  } else if (riskLevel === 'MEDIUM') {
    recommendation = 'Monitor regularly and consider lifestyle adjustments.';
  } else if (trend === 'Increasing') {
    recommendation = 'Keep monitoring as values are rising.';
  }

  return {
    parameter,
    summary,
    trend_insight: trendInsight,
    risk_insight: riskInsight,
    recommendation,
  };
};

export const getDashboardData = async (user, { parameter, limit: queryLimit, patient_id }) => {
  let limit = parseInt(queryLimit, 10) || 20;
  limit = Math.min(limit, 50);

  let patientIds = [];
  if (user.role === 'doctor') {
    if (patient_id) {
      const access = await PatientDoctorAccess.findOne({
        doctor: user.id,
        patient: patient_id,
        status: { $in: ['approved', 'accepted'] },
      });
      if (!access) {
        return {
          user_id: user.id,
          parameters: [],
        };
      }
      patientIds = [patient_id];
    } else {
      const approvedAccess = await PatientDoctorAccess.find({
        doctor: user.id,
        status: { $in: ['approved', 'accepted'] },
      });
      patientIds = approvedAccess.map((access) => access.patient);
    }
  } else {
    patientIds = [user.id];
  }

  const reports = await Report.find({ user: { $in: patientIds } });
  const reportIds = reports.map((r) => r._id);

  const query = { report: { $in: reportIds } };
  if (parameter) {
    query.parameterName = parameter;
  }

  const labValues = await LabValue.find(query).populate('report');
  if (labValues.length === 0) {
    return {
      user_id: user.id,
      parameters: [],
    };
  }

  const grouped = {};
  for (const lv of labValues) {
    const name = lv.parameterName;
    if (!grouped[name]) {
      grouped[name] = [];
    }
    grouped[name].push(lv);
  }

  let uniqueParams = Object.keys(grouped);
  if (!parameter) {
    uniqueParams.sort((a, b) => grouped[b].length - grouped[a].length);
    uniqueParams = uniqueParams.slice(0, limit);
  }

  const parametersData = [];
  for (const paramName of uniqueParams) {
    const values = grouped[paramName];
    
    values.sort((a, b) => {
      const dateA = a.report.reportDate || a.report.uploadDate;
      const dateB = b.report.reportDate || b.report.uploadDate;
      return dateA - dateB;
    });

    const limitedValues = values.slice(-MAX_REPORTS_PER_PARAMETER);

    const analytics = getParameterAnalytics(paramName, limitedValues);
    const risk = evaluateRisk(analytics);
    const insights = generateInsights(analytics, risk);

    parametersData.push({
      parameter: paramName,
      analytics,
      risk,
      insights,
    });
  }

  return {
    user_id: user.id,
    parameters: parametersData,
  };
};
