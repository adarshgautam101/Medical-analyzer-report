import { LabValue, Report, PatientDoctorAccess } from '../models/index.js';

export const getLabValues = async (user, { parameter_name, start_date, end_date }) => {
  let patientIds = [];

  if (user.role === 'doctor') {
    const approvedAccess = await PatientDoctorAccess.find({
      doctor: user.id,
      status: { $in: ['approved', 'accepted'] },
    });
    patientIds = approvedAccess.map((access) => access.patient);
  } else {
    patientIds = [user.id];
  }

  const reportQuery = { user: { $in: patientIds } };

  if (start_date) {
    reportQuery.reportDate = { ...reportQuery.reportDate, $gte: new Date(start_date) };
  }

  if (end_date) {
    reportQuery.reportDate = { ...reportQuery.reportDate, $lte: new Date(end_date) };
  }

  const reports = await Report.find(reportQuery);
  const reportIds = reports.map((r) => r._id);

  const labValueQuery = { report: { $in: reportIds } };
  if (parameter_name) {
    labValueQuery.parameterName = parameter_name;
  }

  const labValues = await LabValue.find(labValueQuery).populate('report');

  return labValues.map((lv) => ({
    id: lv._id.toString(),
    report_id: lv.report._id.toString(),
    parameter_name: lv.parameterName,
    value: lv.value,
    unit: lv.unit,
    reference_range: lv.referenceRange,
    is_abnormal: lv.isAbnormal,
    report_date: lv.report.reportDate 
      ? lv.report.reportDate.toISOString() 
      : lv.report.uploadDate.toISOString(),
  }));
};
