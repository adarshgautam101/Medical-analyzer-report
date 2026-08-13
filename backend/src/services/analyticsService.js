import { LabValue, Report, PatientDoctorAccess, UniversalRange, User } from '../models/index.js';
import { normalizeToScore, scoreToStatus, inferReportName, calculatePearson } from '../utils/analytics.js';
import { generateTrendSVG, generateComparisonSVG, generateHealthSummarySVG, generateCorrelationSVG } from '../utils/chartGenerator.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors/AppError.js';
import { callOllamaChat } from '../utils/ollamaChat.js';
import { calculateStatus } from '../utils/parser.js';

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

export const getTrendChart = async (user, { parameter_name, start_date, end_date }) => {
  const patientIds = await getTargetPatientIds(user);
  
  const reportQuery = { user: { $in: patientIds } };
  if (start_date) {
    reportQuery.reportDate = { ...reportQuery.reportDate, $gte: new Date(start_date) };
  }
  if (end_date) {
    reportQuery.reportDate = { ...reportQuery.reportDate, $lte: new Date(end_date) };
  }

  const reports = await Report.find(reportQuery);
  const reportIds = reports.map((r) => r._id);

  const labValues = await LabValue.find({
    report: { $in: reportIds },
    parameterName: parameter_name,
  }).populate('report');

  const chartData = labValues.map((lv) => ({
    date: lv.report.reportDate 
      ? lv.report.reportDate.toISOString() 
      : lv.report.uploadDate.toISOString(),
    value: lv.value,
    unit: lv.unit || '',
    reference_range: lv.referenceRange || '',
    is_abnormal: lv.isAbnormal,
  }));

  return generateTrendSVG(parameter_name, chartData);
};

export const getComparisonChart = async (user, { parameter_names }) => {
  if (!parameter_names) {
    throw new BadRequestError('parameter_names query parameter is required');
  }

  const paramsList = parameter_names.split(',');
  const patientIds = await getTargetPatientIds(user);
  const reports = await Report.find({ user: { $in: patientIds } });
  const reportIds = reports.map((r) => r._id);

  const latestValues = [];
  for (const paramName of paramsList) {
    const lv = await LabValue.findOne({
      report: { $in: reportIds },
      parameterName: paramName,
    })
      .populate('report')
      .sort({ 'report.reportDate': -1, 'report.uploadDate': -1 });

    if (lv) {
      
      const univ = await UniversalRange.findOne({ parameterName: paramName });
      const refRange = univ ? univ.referenceRange : (lv.referenceRange || '');
      const unit = univ ? univ.unit : (lv.unit || '');

      latestValues.push({
        parameter: paramName,
        value: lv.value,
        unit: unit,
        reference_range: refRange,
        is_abnormal: lv.isAbnormal,
      });
    }
  }

  return generateComparisonSVG(latestValues);
};

export const getHealthSummaryChart = async (user) => {
  const patientIds = await getTargetPatientIds(user);
  const reports = await Report.find({ user: { $in: patientIds } });
  const reportIds = reports.map((r) => r._id);
  const labValues = await LabValue.find({ report: { $in: reportIds } });

  const chartData = labValues.map((lv) => ({
    parameter_name: lv.parameterName,
    is_abnormal: lv.isAbnormal,
  }));

  return generateHealthSummarySVG(chartData);
};

export const getCorrelationChart = async (user) => {
  const patientIds = await getTargetPatientIds(user);
  const reports = await Report.find({ user: { $in: patientIds } });
  const reportIds = reports.map((r) => r._id);
  const labValues = await LabValue.find({ report: { $in: reportIds } });

  if (labValues.length === 0) {
    return generateCorrelationSVG([], []);
  }

  const uniqueParams = [...new Set(labValues.map((lv) => lv.parameterName))].sort();
  const uniqueReports = [...new Set(labValues.map((lv) => lv.report.toString()))];

  const pivot = {};
  for (const lv of labValues) {
    const repId = lv.report.toString();
    const pName = lv.parameterName;
    if (!pivot[repId]) pivot[repId] = {};
    if (!pivot[repId][pName]) pivot[repId][pName] = [];
    pivot[repId][pName].push(lv.value);
  }

  const pivotedAvg = {};
  for (const rId of uniqueReports) {
    pivotedAvg[rId] = {};
    for (const pName of uniqueParams) {
      const vals = pivot[rId][pName] || [];
      pivotedAvg[rId][pName] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
  }

  const validReports = uniqueReports.filter((rId) => {
    return uniqueParams.some((pName) => pivotedAvg[rId][pName] !== null);
  });

  const matrix = [];
  for (let i = 0; i < uniqueParams.length; i++) {
    matrix.push(new Array(uniqueParams.length).fill(0));
  }

  for (let i = 0; i < uniqueParams.length; i++) {
    const p1 = uniqueParams[i];
    for (let j = 0; j < uniqueParams.length; j++) {
      const p2 = uniqueParams[j];

      if (i === j) {
        matrix[i][j] = 1.0;
        continue;
      }

      const vector1 = [];
      const vector2 = [];

      for (const rId of validReports) {
        const v1 = pivotedAvg[rId][p1];
        const v2 = pivotedAvg[rId][p2];
        if (v1 !== null && v2 !== null) {
          vector1.push(v1);
          vector2.push(v2);
        }
      }

      let correlation = 0.0;
      if (vector1.length >= 2) {
        correlation = calculatePearson(vector1, vector2);
      }

      matrix[i][j] = correlation;
    }
  }

  return generateCorrelationSVG(uniqueParams, matrix);
};

export const getHealthSummaryJson = async (user) => {
  const patientIds = await getTargetPatientIds(user);
  const reports = await Report.find({ user: { $in: patientIds } });
  const reportIds = reports.map((r) => r._id);
  const labValues = await LabValue.find({ report: { $in: reportIds } });

  if (labValues.length === 0) {
    return {
      overall_score: null,
      reports: [],
      parameters: [],
      flagged_count: 0,
      normal_count: 0,
    };
  }

  const reportGroups = {};
  for (const lv of labValues) {
    const repId = lv.report.toString();
    if (!reportGroups[repId]) {
      reportGroups[repId] = [];
    }
    reportGroups[repId].push(lv);
  }

  const reportsOut = [];
  const allScores = [];

  for (const reportObj of reports) {
    const repIdStr = reportObj._id.toString();
    const group = reportGroups[repIdStr] || [];
    if (group.length === 0) continue;

    const parameterNames = group.map((lv) => lv.parameterName);
    const reportName = inferReportName(parameterNames);
    
    const rDate = reportObj.reportDate || reportObj.uploadDate;
    const dateStr = rDate ? rDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

    const paramsOut = group.map((lv) => {
      const score = normalizeToScore(lv.value, lv.referenceRange, lv.isAbnormal);
      allScores.push(score);
      return {
        name: lv.parameterName,
        value: lv.value,
        unit: lv.unit || '',
        ref_range: lv.referenceRange || '',
        is_abnormal: lv.isAbnormal,
        score,
        status: scoreToStatus(score),
      };
    });

    const paramScores = paramsOut.map((p) => p.score).filter((s) => s !== null);
    const reportScore = paramScores.length ? Math.round(paramScores.reduce((a, b) => a + b, 0) / paramScores.length) : null;

    reportsOut.push({
      report_id: reportObj._id.toString(),
      report_name: reportName,
      date: dateStr,
      score: reportScore,
      parameters: paramsOut,
    });
  }

  const flatParams = [];
  for (const r of reportsOut) {
    for (const p of r.parameters) {
      flatParams.push({
        ...p,
        report_name: r.report_name,
      });
    }
  }

  const overallScore = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null;
  const flaggedCount = flatParams.filter((p) => p.is_abnormal).length;
  const normalCount = flatParams.length - flaggedCount;

  return {
    overall_score: overallScore,
    reports: reportsOut,
    parameters: flatParams,
    flagged_count: flaggedCount,
    normal_count: normalCount,
  };
};

export const getCorrelationJson = async (user) => {
  const patientIds = await getTargetPatientIds(user);
  const reports = await Report.find({ user: { $in: patientIds } });
  const reportIds = reports.map((r) => r._id);
  const labValues = await LabValue.find({ report: { $in: reportIds } });

  if (labValues.length === 0) {
    return { parameters: [], matrix: [], pairs: [] };
  }

  const uniqueParams = [...new Set(labValues.map((lv) => lv.parameterName))].sort();
  const uniqueReports = [...new Set(labValues.map((lv) => lv.report.toString()))];

  if (uniqueParams.length < 2) {
    return { parameters: [], matrix: [], pairs: [] };
  }

  const pivot = {};
  for (const lv of labValues) {
    const repId = lv.report.toString();
    const pName = lv.parameterName;
    if (!pivot[repId]) pivot[repId] = {};
    if (!pivot[repId][pName]) pivot[repId][pName] = [];
    pivot[repId][pName].push(lv.value);
  }

  const pivotedAvg = {};
  for (const rId of uniqueReports) {
    pivotedAvg[rId] = {};
    for (const pName of uniqueParams) {
      const vals = pivot[rId][pName] || [];
      pivotedAvg[rId][pName] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
  }

  const validReports = uniqueReports.filter((rId) => {
    return uniqueParams.some((pName) => pivotedAvg[rId][pName] !== null);
  });

  const matrix = [];
  for (let i = 0; i < uniqueParams.length; i++) {
    matrix.push(new Array(uniqueParams.length).fill(0));
  }

  const pairs = [];

  for (let i = 0; i < uniqueParams.length; i++) {
    const p1 = uniqueParams[i];
    for (let j = 0; j < uniqueParams.length; j++) {
      const p2 = uniqueParams[j];

      if (i === j) {
        matrix[i][j] = 1.0;
        continue;
      }

      const vector1 = [];
      const vector2 = [];

      for (const rId of validReports) {
        const v1 = pivotedAvg[rId][p1];
        const v2 = pivotedAvg[rId][p2];
        if (v1 !== null && v2 !== null) {
          vector1.push(v1);
          vector2.push(v2);
        }
      }

      let correlation = 0.0;
      if (vector1.length >= 2) {
        correlation = calculatePearson(vector1, vector2);
      }

      matrix[i][j] = Math.round(correlation * 100) / 100;

      if (j > i) {
        pairs.push({
          param1: p1,
          param2: p2,
          label: `${p1} & ${p2}`,
          value: Math.round(correlation * 100) / 100,
          abs_value: Math.round(Math.abs(correlation) * 100) / 100,
        });
      }
    }
  }

  pairs.sort((a, b) => b.abs_value - a.abs_value);

  return {
    parameters: uniqueParams,
    matrix,
    pairs: pairs.slice(0, 10),
  };
};

export const getPatientAiChat = async (user, patientId, validatedMessages) => {
  if (user.role !== 'doctor') {
    throw new ForbiddenError('Access forbidden: Only doctors can access AI chat.');
  }

  const patient = await User.findById(patientId);
  if (!patient) {
    throw new NotFoundError('Patient not found.');
  }

  const hasAccess = await PatientDoctorAccess.findOne({
    doctor: user.id,
    patient: patientId,
    status: { $in: ['approved', 'accepted'] },
  });

  if (!hasAccess) {
    throw new ForbiddenError('Unauthorized access: You do not have approved access to this patient.');
  }

  const reports = await Report.find({ user: patientId, ocrStatus: 'completed' })
    .sort({ reportDate: -1, uploadDate: -1 })
    .limit(5);

  const contextReports = [];
  for (const report of reports) {
    const labValues = await LabValue.find({ report: report._id });
    contextReports.push({
      reportId: report._id.toString(),
      reportDate: report.reportDate || report.uploadDate,
      fileName: report.fileName,
      aiSummary: report.aiSummary || '',
      labValues: labValues.map((lv) => ({
        parameter: lv.parameterName,
        value: lv.value,
        unit: lv.unit || '',
        referenceRange: lv.referenceRange || '',
        status: calculateStatus(lv.value, lv.referenceRange, lv.isAbnormal),
      })),
    });
  }

  const systemPrompt = `You are a clinical report summarization assistant.
You have access ONLY to the following validated patient reports context:
${JSON.stringify(contextReports, null, 2)}

Strict Rules:
1. Base answers ONLY on the supplied validated reports and lab values.
2. Do not invent report dates, parameters, values, or reference ranges.
3. Never suggest a definitive diagnosis, recommend medication changes, or provide direct medical treatment instructions.
4. Use only the high/low/normal status calculated by the system; do not re-calculate normal/abnormal status.
5. If the user asks for comparison, compare values across report dates.
6. If the requested information is not in the context, explicitly state that it is unavailable.
7. If there are no reports in the context, explicitly state: "No medical reports are available for this patient."
8. You only have access to the latest 5 reports. If asked about older information, state it is unavailable in the supplied reports context.`;

  const ollamaMessages = [
    { role: 'system', content: systemPrompt },
    ...validatedMessages,
  ];

  const reply = await callOllamaChat(ollamaMessages);
  return { reply };
};
