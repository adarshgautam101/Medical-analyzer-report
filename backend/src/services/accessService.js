import { User, PatientDoctorAccess, PatientProfile, Report } from '../models/index.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';

const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

export const getPatientDiscoveryStats = async (user) => {
  if (user.role !== 'patient') {
    throw new ForbiddenError('Patients only');
  }

  const totalDoctors = await User.countDocuments({ role: 'doctor' });
  const active = await PatientDoctorAccess.countDocuments({
    patient: user.id,
    status: { $in: ['approved', 'accepted'] },
  });

  return {
    total_doctors_on_platform: totalDoctors,
    your_active_doctors: active,
  };
};

export const getDoctorAssignmentStats = async (user) => {
  if (user.role !== 'doctor') {
    throw new ForbiddenError('Doctors only');
  }

  const totalPatients = await User.countDocuments({ role: 'patient' });
  const assigned = await PatientDoctorAccess.countDocuments({
    doctor: user.id,
    status: { $in: ['approved', 'accepted'] },
  });

  return {
    total_patients_on_platform: totalPatients,
    your_assigned_patients: assigned,
  };
};

export const requestDoctorAccess = async (user, doctorId) => {
  if (user.role !== 'patient') {
    throw new ForbiddenError('Patients only');
  }

  if (doctorId === user.id) {
    throw new BadRequestError('Invalid doctor');
  }

  const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
  if (!doctor) {
    throw new NotFoundError('Doctor not found');
  }

  let access = await PatientDoctorAccess.findOne({
    patient: user.id,
    doctor: doctorId,
  });

  if (access) {
    if (['approved', 'accepted'].includes(access.status)) {
      throw new BadRequestError('Already an active connection');
    }
    if (['rejected', 'revoked'].includes(access.status)) {
      access.status = 'pending';
      access.revokedAt = null;
    }
    access.updatedAt = new Date();
  } else {
    access = new PatientDoctorAccess({
      patient: user.id,
      doctor: doctorId,
      status: 'pending',
    });
  }

  await access.save();
  logger.info(`Doctor access requested: patient=${user.id}, doctor=${doctorId}`);
  return { id: access._id.toString(), status: access.status };
};

export const getPatientDoctorAccessList = async (user) => {
  if (user.role !== 'patient') {
    throw new ForbiddenError('Patients only');
  }

  const accessList = await PatientDoctorAccess.find({ patient: user.id })
    .populate('doctor')
    .sort({ updatedAt: -1 });

  return accessList.map((a) => ({
    id: a._id.toString(),
    patient_id: a.patient.toString(),
    doctor_id: a.doctor._id.toString(),
    status: a.status,
    doctor_name: a.doctor.fullName,
  }));
};

export const getDoctorPatientAccessRequests = async (user, statusFilter) => {
  if (user.role !== 'doctor') {
    throw new ForbiddenError('Doctors only');
  }

  const query = { doctor: user.id };
  if (statusFilter) {
    query.status = statusFilter;
  }

  const requests = await PatientDoctorAccess.find(query)
    .populate('patient')
    .sort({ createdAt: -1 });

  return requests.map((r) => ({
    id: r._id.toString(),
    patient_id: r.patient._id.toString(),
    doctor_id: r.doctor.toString(),
    status: r.status,
    patient_name: r.patient.fullName,
  }));
};

export const acceptPatientAccessRequest = async (user, requestId) => {
  if (user.role !== 'doctor') {
    throw new ForbiddenError('Doctors only');
  }

  const access = await PatientDoctorAccess.findOne({
    _id: requestId,
    doctor: user.id,
  });

  if (!access) {
    throw new NotFoundError('Request not found');
  }

  if (access.status !== 'pending') {
    throw new BadRequestError('Request is not pending');
  }

  access.status = 'approved';
  access.grantedAt = new Date();
  access.revokedAt = null;
  access.updatedAt = new Date();

  await access.save();
  logger.info(`Doctor access approved: doctor=${user.id}, request=${requestId}, patient=${access.patient}`);
  return { id: access._id.toString(), status: access.status };
};

export const rejectPatientAccessRequest = async (user, requestId) => {
  if (user.role !== 'doctor') {
    throw new ForbiddenError('Doctors only');
  }

  const access = await PatientDoctorAccess.findOne({
    _id: requestId,
    doctor: user.id,
  });

  if (!access) {
    throw new NotFoundError('Request not found');
  }

  if (access.status !== 'pending') {
    throw new BadRequestError('Request is not pending');
  }

  access.status = 'rejected';
  access.updatedAt = new Date();

  await access.save();
  logger.info(`Doctor access rejected: doctor=${user.id}, request=${requestId}, patient=${access.patient}`);
  return { id: access._id.toString(), status: access.status };
};

export const revokeDoctorAccess = async (user, requestId) => {
  if (user.role !== 'patient') {
    throw new ForbiddenError('Patients only');
  }

  const access = await PatientDoctorAccess.findOne({
    _id: requestId,
    patient: user.id,
  });

  if (!access) {
    throw new NotFoundError('Access request not found');
  }

  access.status = 'revoked';
  access.revokedAt = new Date();
  access.updatedAt = new Date();

  await access.save();
  logger.info(`Doctor access revoked: patient=${user.id}, request=${requestId}, doctor=${access.doctor}`);
  return { id: access._id.toString(), status: access.status };
};

export const getDoctorsList = async ({ name, category_id, specialty_id }) => {
  const filter = { role: 'doctor' };

  if (name) {
    filter.fullName = { $regex: name.trim(), $options: 'i' };
  }

  if (category_id && isValidObjectId(category_id)) {
    filter.doctorCategory = category_id;
  }

  if (specialty_id && isValidObjectId(specialty_id)) {
    filter.doctorSpecialty = specialty_id;
  }

  const doctors = await User.find(filter)
    .populate('doctorCategory')
    .populate('doctorSpecialty')
    .sort({ fullName: 1 });

  return doctors.map((d) => ({
    id: d._id.toString(),
    full_name: d.fullName,
    category_id: d.doctorCategory ? d.doctorCategory._id.toString() : null,
    category_name: d.doctorCategory ? d.doctorCategory.name : null,
    specialty_id: d.doctorSpecialty ? d.doctorSpecialty._id.toString() : null,
    specialty_name: d.doctorSpecialty ? d.doctorSpecialty.name : null,
  }));
};

export const getPatientsList = async (user, search) => {
  if (user.role !== 'doctor') {
    throw new ForbiddenError('Only doctors can view patients');
  }

  const approvedAccess = await PatientDoctorAccess.find({
    doctor: user.id,
    status: 'approved',
  });
  const patientIds = approvedAccess.map((access) => access.patient);

  const filter = {
    role: 'patient',
    _id: { $in: patientIds },
  };

  if (search) {
    filter.$or = [
      { fullName: { $regex: search.trim(), $options: 'i' } },
      { email: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const patients = await User.find(filter);

  const patientProfiles = await PatientProfile.find({ user: { $in: patientIds } });
  const profileMap = {};
  patientProfiles.forEach((p) => {
    profileMap[p.user.toString()] = p;
  });

  const reports = await Report.find({ user: { $in: patientIds } }).sort({ uploadDate: -1 });
  const reportsMap = {};
  reports.forEach((r) => {
    const pId = r.user.toString();
    if (!reportsMap[pId]) {
      reportsMap[pId] = [];
    }
    reportsMap[pId].push(r);
  });

  return patients.map((patientUser) => {
    const pId = patientUser._id.toString();
    const profile = profileMap[pId];
    const patientReports = reportsMap[pId] || [];
    const reportCount = patientReports.length;
    const lastReportDate = reportCount > 0 ? (patientReports[0].reportDate || patientReports[0].uploadDate) : null;
    return {
      id: pId,
      email: patientUser.email,
      full_name: patientUser.fullName,
      age: profile ? profile.age : null,
      gender: profile ? profile.gender : null,
      blood_group: profile ? profile.bloodGroup : null,
      report_count: reportCount,
      last_report_date: lastReportDate ? lastReportDate.toISOString() : null,
    };
  });
};
