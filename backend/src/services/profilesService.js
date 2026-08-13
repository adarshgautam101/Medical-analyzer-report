import mongoose from 'mongoose';
import { User, DoctorCategory, DoctorProfile, PatientProfile, Report, LabValue, Medicine, DoctorNote, PatientDoctorAccess } from '../models/index.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';

const checkDoctorAccess = async (patientId, doctorId) => {
  const allowedStatuses = ['approved', 'accepted'];
  const access = await PatientDoctorAccess.findOne({
    patient: patientId,
    doctor: doctorId,
    status: { $in: allowedStatuses },
  });
  return access !== null;
};

export const getDoctorProfile = async (user) => {
  if (user.role !== 'doctor') {
    throw new ForbiddenError('Only doctors can access this');
  }

  const userDoc = await User.findById(user.id).populate('doctorCategory');
  const profile = await DoctorProfile.findOne({ user: user.id });

  return {
    id: profile ? profile._id.toString() : null,
    user_id: user.id,
    degrees: profile ? profile.degrees : null,
    experience_years: profile ? profile.experienceYears : null,
    license_number: profile ? profile.licenseNumber : null,
    license_issuing_authority: profile ? profile.licenseIssuingAuthority : null,
    clinic_name: profile ? profile.clinicName : null,
    clinic_address: profile ? profile.clinicAddress : null,
    clinic_phone: profile ? profile.clinicPhone : null,
    clinic_email: profile ? profile.clinicEmail : null,
    bio: profile ? profile.bio : null,
    doctor_category_id: userDoc?.doctorCategory?._id?.toString() || null,
    doctor_category_name: userDoc?.doctorCategory?.name || null,
    visible_fields: profile?.visibleFields ? Object.fromEntries(profile.visibleFields) : {},
    exists: !!profile,
  };
};

export const createDoctorProfile = async (user, data) => {
  if (user.role !== 'doctor') {
    throw new ForbiddenError('Only doctors can create profile');
  }

  const existing = await DoctorProfile.findOne({ user: user.id });
  if (existing) {
    throw new BadRequestError('Profile already exists, use PUT to update');
  }

  const { degrees, experience_years, license_number, license_issuing_authority, clinic_name, clinic_address, clinic_phone, clinic_email, bio } = data;

  const profile = new DoctorProfile({
    user: user.id,
    degrees,
    experienceYears: experience_years,
    licenseNumber: license_number,
    licenseIssuingAuthority: license_issuing_authority,
    clinicName: clinic_name,
    clinicAddress: clinic_address,
    clinicPhone: clinic_phone,
    clinicEmail: clinic_email,
    bio,
  });

  await profile.save();
  logger.info(`Doctor profile created for user ${user.id}`);

  const userDoc = await User.findById(user.id).populate('doctorCategory');

  return {
    id: profile._id.toString(),
    user_id: profile.user.toString(),
    degrees: profile.degrees,
    experience_years: profile.experienceYears,
    license_number: profile.licenseNumber,
    license_issuing_authority: profile.licenseIssuingAuthority,
    clinic_name: profile.clinicName,
    clinic_address: profile.clinicAddress,
    clinic_phone: profile.clinicPhone,
    clinic_email: profile.clinicEmail,
    bio: profile.bio,
    doctor_category_id: userDoc?.doctorCategory?._id?.toString() || null,
    doctor_category_name: userDoc?.doctorCategory?.name || null,
  };
};

export const updateDoctorProfile = async (user, data) => {
  if (user.role !== 'doctor') {
    throw new ForbiddenError('Only doctors can update profile');
  }

  const { degrees, experience_years, license_number, license_issuing_authority, clinic_name, clinic_address, clinic_phone, clinic_email, bio, visible_fields, doctor_category_id, other_category_name } = data;

  if (doctor_category_id && typeof doctor_category_id === 'string' && doctor_category_id.trim() !== '' && mongoose.Types.ObjectId.isValid(doctor_category_id)) {
    const selectedCat = await DoctorCategory.findById(doctor_category_id);
    const trimmedCustom = (other_category_name || '').trim();

    if (selectedCat && selectedCat.name.toLowerCase() === 'others' && trimmedCustom) {
      let customCat = await DoctorCategory.findOne({ name: trimmedCustom });
      if (!customCat) {
        customCat = new DoctorCategory({ name: trimmedCustom });
        await customCat.save();
        logger.info(`Created new custom Doctor Category: ${trimmedCustom}`);
      }
      await User.findByIdAndUpdate(user.id, { doctorCategory: customCat._id });
    } else if (selectedCat) {
      await User.findByIdAndUpdate(user.id, { doctorCategory: selectedCat._id });
    }
  }

  let profile = await DoctorProfile.findOne({ user: user.id });
  if (!profile) {
    profile = new DoctorProfile({ user: user.id });
  }

  profile.degrees = degrees !== undefined ? degrees : profile.degrees;
  profile.experienceYears = experience_years !== undefined ? experience_years : profile.experienceYears;
  profile.licenseNumber = license_number !== undefined ? license_number : profile.licenseNumber;
  profile.licenseIssuingAuthority = license_issuing_authority !== undefined ? license_issuing_authority : profile.licenseIssuingAuthority;
  profile.clinicName = clinic_name !== undefined ? clinic_name : profile.clinicName;
  profile.clinicAddress = clinic_address !== undefined ? clinic_address : profile.clinicAddress;
  profile.clinicPhone = clinic_phone !== undefined ? clinic_phone : profile.clinicPhone;
  profile.clinicEmail = clinic_email !== undefined ? clinic_email : profile.clinicEmail;
  profile.bio = bio !== undefined ? bio : profile.bio;
  if (visible_fields && typeof visible_fields === 'object') {
    for (const [key, value] of Object.entries(visible_fields)) {
      profile.visibleFields.set(key, !!value);
    }
  }
  profile.updatedAt = new Date();

  await profile.save();
  logger.info(`Doctor profile updated for user ${user.id}`);

  const userDoc = await User.findById(user.id).populate('doctorCategory');

  return {
    id: profile._id.toString(),
    user_id: profile.user.toString(),
    degrees: profile.degrees,
    experience_years: profile.experienceYears,
    license_number: profile.licenseNumber,
    license_issuing_authority: profile.licenseIssuingAuthority,
    clinic_name: profile.clinicName,
    clinic_address: profile.clinicAddress,
    clinic_phone: profile.clinicPhone,
    clinic_email: profile.clinicEmail,
    bio: profile.bio,
    doctor_category_id: userDoc?.doctorCategory?._id?.toString() || null,
    doctor_category_name: userDoc?.doctorCategory?.name || null,
    visible_fields: profile.visibleFields ? Object.fromEntries(profile.visibleFields) : {},
  };
};

export const getPublicDoctorInfo = async (doctorId) => {
  const doctor = await User.findOne({ _id: doctorId, role: 'doctor' }).populate('doctorCategory');
  if (!doctor) {
    throw new NotFoundError('Doctor not found');
  }

  const profile = await DoctorProfile.findOne({ user: doctorId });

  const base = {
    id: doctor._id.toString(),
    full_name: doctor.fullName,
    category_name: doctor.doctorCategory ? doctor.doctorCategory.name : null,
    degrees: profile ? profile.degrees : null,
    experienceYears: profile ? profile.experienceYears : null,
  };

  if (!profile) {
    return base;
  }

  const vis = profile.visibleFields ? Object.fromEntries(profile.visibleFields) : {};

  const fieldMapping = {
    licenseNumber: profile.licenseNumber,
    licenseIssuingAuthority: profile.licenseIssuingAuthority,
    clinicName: profile.clinicName,
    clinicAddress: profile.clinicAddress,
    clinicPhone: profile.clinicPhone,
    clinicEmail: profile.clinicEmail,
    bio: profile.bio,
  };

  const result = { ...base };
  for (const [field, value] of Object.entries(fieldMapping)) {
    if (vis[field] === true) {
      result[field] = value;
    }
  }

  return result;
};

export const getPatientProfile = async (user) => {
  const profile = await PatientProfile.findOne({ user: user.id });
  if (!profile) {
    return { user_id: user.id, exists: false };
  }

  if (profile.heightCm && profile.weightKg) {
    const heightM = profile.heightCm / 100;
    profile.bmi = profile.weightKg / (heightM * heightM);
    await profile.save();
  }

  return {
    id: profile._id.toString(),
    user_id: profile.user.toString(),
    age: profile.age,
    gender: profile.gender,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    bmi: profile.bmi ? Math.round(profile.bmi * 100) / 100 : null,
    blood_group: profile.bloodGroup,
    allergies: profile.allergies,
    chronic_conditions: profile.chronicConditions,
    lifestyle_indicators: profile.lifestyleIndicators,
    emergency_contact_name: profile.emergencyContactName,
    emergency_contact_phone: profile.emergencyContactPhone,
    exists: true,
  };
};

export const createPatientProfile = async (user, data) => {
  const existing = await PatientProfile.findOne({ user: user.id });
  if (existing) {
    throw new BadRequestError('Profile already exists, use PUT to update');
  }

  const { age, gender, height_cm, weight_kg, blood_group, allergies, chronic_conditions, lifestyle_indicators, emergency_contact_name, emergency_contact_phone } = data;

  const profile = new PatientProfile({
    user: user.id,
    age,
    gender,
    heightCm: height_cm,
    weightKg: weight_kg,
    bloodGroup: blood_group,
    allergies,
    chronicConditions: chronic_conditions,
    lifestyleIndicators: lifestyle_indicators,
    emergencyContactName: emergency_contact_name,
    emergencyContactPhone: emergency_contact_phone,
  });

  if (profile.heightCm && profile.weightKg) {
    const heightM = profile.heightCm / 100;
    profile.bmi = profile.weightKg / (heightM * heightM);
  }

  await profile.save();
  logger.info(`Patient profile created for user ${user.id}`);

  return {
    id: profile._id.toString(),
    user_id: profile.user.toString(),
    age: profile.age,
    gender: profile.gender,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    bmi: profile.bmi ? Math.round(profile.bmi * 100) / 100 : null,
    blood_group: profile.bloodGroup,
    allergies: profile.allergies,
    chronic_conditions: profile.chronicConditions,
    lifestyle_indicators: profile.lifestyleIndicators,
    emergency_contact_name: profile.emergencyContactName,
    emergency_contact_phone: profile.emergencyContactPhone,
  };
};

export const updatePatientProfile = async (user, data) => {
  const { age, gender, height_cm, weight_kg, blood_group, allergies, chronic_conditions, lifestyle_indicators, emergency_contact_name, emergency_contact_phone } = data;

  let profile = await PatientProfile.findOne({ user: user.id });
  if (!profile) {
    profile = new PatientProfile({ user: user.id });
  }

  profile.age = age !== undefined ? age : profile.age;
  profile.gender = gender !== undefined ? gender : profile.gender;
  profile.heightCm = height_cm !== undefined ? height_cm : profile.heightCm;
  profile.weightKg = weight_kg !== undefined ? weight_kg : profile.weightKg;
  profile.bloodGroup = blood_group !== undefined ? blood_group : profile.bloodGroup;
  profile.allergies = allergies !== undefined ? allergies : profile.allergies;
  profile.chronicConditions = chronic_conditions !== undefined ? chronic_conditions : profile.chronicConditions;
  profile.lifestyleIndicators = lifestyle_indicators !== undefined ? lifestyle_indicators : profile.lifestyleIndicators;
  profile.emergencyContactName = emergency_contact_name !== undefined ? emergency_contact_name : profile.emergencyContactName;
  profile.emergencyContactPhone = emergency_contact_phone !== undefined ? emergency_contact_phone : profile.emergencyContactPhone;
  profile.updatedAt = new Date();

  if (profile.heightCm && profile.weightKg) {
    const heightM = profile.heightCm / 100;
    profile.bmi = profile.weightKg / (heightM * heightM);
  } else {
    profile.bmi = null;
  }

  await profile.save();
  logger.info(`Patient profile updated for user ${user.id}`);

  return {
    id: profile._id.toString(),
    user_id: profile.user.toString(),
    age: profile.age,
    gender: profile.gender,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    bmi: profile.bmi ? Math.round(profile.bmi * 100) / 100 : null,
    blood_group: profile.bloodGroup,
    allergies: profile.allergies,
    chronic_conditions: profile.chronicConditions,
    lifestyle_indicators: profile.lifestyleIndicators,
    emergency_contact_name: profile.emergencyContactName,
    emergency_contact_phone: profile.emergencyContactPhone,
  };
};

export const getDoctorStats = async (user) => {
  if (user.role !== 'doctor') {
    throw new ForbiddenError('Only doctors can access statistics');
  }

  const totalPatients = await User.countDocuments({ role: 'patient' });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentPatients = await User.countDocuments({
    role: 'patient',
    createdAt: { $gte: sevenDaysAgo },
  });

  const weeklyConsultations = await DoctorNote.countDocuments({
    doctor: user.id,
    createdAt: { $gte: sevenDaysAgo },
  });

  const approvedAccess = await PatientDoctorAccess.find({
    doctor: user.id,
    status: { $in: ['approved', 'accepted'] },
  });
  const patientIds = approvedAccess.map((a) => a.patient);

  const reports = await Report.find({ user: { $in: patientIds } });
  const reportIds = reports.map((r) => r._id);

  const criticalPatientIds = await LabValue.distinct('report', {
    report: { $in: reportIds },
    isAbnormal: true,
  });
  
  const criticalReports = await Report.find({ _id: { $in: criticalPatientIds } });
  const uniqueCriticalPatients = new Set(criticalReports.map((r) => r.user.toString()));
  const criticalCasesCount = uniqueCriticalPatients.size;

  const totalReportsReviewed = reports.length;

  return {
    total_patients: totalPatients,
    recent_patients: recentPatients,
    weekly_consultations: weeklyConsultations,
    critical_cases: criticalCasesCount,
    total_reports: totalReportsReviewed,
  };
};

export const getPatientDossier = async (user, patientId) => {
  if (user.role !== 'doctor') {
    throw new ForbiddenError('Only doctors can view patient details');
  }

  const patient = await User.findOne({ _id: patientId, role: 'patient' });
  if (!patient) {
    throw new NotFoundError('Patient not found');
  }

  const hasAccess = await checkDoctorAccess(patientId, user.id);
  if (!hasAccess) {
    throw new ForbiddenError('Access not granted');
  }

  const profile = await PatientProfile.findOne({ user: patientId });
  const reports = await Report.find({ user: patientId }).populate('category').sort({ uploadDate: -1 });
  const medicines = await Medicine.find({ user: patientId }).sort({ createdAt: -1 });
  const notes = await DoctorNote.find({ patient: patientId, doctor: user.id }).sort({ createdAt: -1 });

  const reportIds = reports.map((r) => r._id);
  const abnormalValues = await LabValue.find({
    report: { $in: reportIds },
    isAbnormal: true,
  });

  return {
    patient: {
      id: patient._id.toString(),
      email: patient.email,
      full_name: patient.fullName,
      created_at: patient.createdAt ? patient.createdAt.toISOString() : null,
    },
    profile: {
      age: profile ? profile.age : null,
      gender: profile ? profile.gender : null,
      height_cm: profile ? profile.heightCm : null,
      weight_kg: profile ? profile.weightKg : null,
      bmi: profile && profile.bmi ? Math.round(profile.bmi * 100) / 100 : null,
      blood_group: profile ? profile.bloodGroup : null,
      allergies: profile ? profile.allergies : null,
      chronic_conditions: profile ? profile.chronicConditions : null,
      lifestyle_indicators: profile ? profile.lifestyleIndicators : null,
      emergency_contact_name: profile ? profile.emergencyContactName : null,
      emergency_contact_phone: profile ? profile.emergencyContactPhone : null,
    },
    reports: reports.map((r) => ({
      id: r._id.toString(),
      file_name: r.fileName,
      upload_date: r.uploadDate.toISOString(),
      ocr_status: r.ocrStatus,
      ai_summary: r.aiSummary,
      category: r.category ? r.category.name : null,
    })),
    medicines: medicines.map((m) => ({
      id: m._id.toString(),
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      start_date: m.startDate.toISOString().split('T')[0],
      end_date: m.endDate ? m.endDate.toISOString().split('T')[0] : null,
      status: m.status,
    })),
    notes: notes.map((n) => ({
      id: n._id.toString(),
      note_text: n.noteText,
      note_type: n.noteType,
      created_at: n.createdAt.toISOString(),
      report_id: n.report ? n.report.toString() : null,
    })),
    abnormal_values: abnormalValues.map((lv) => ({
      id: lv._id.toString(),
      parameter_name: lv.parameterName,
      value: lv.value,
      unit: lv.unit,
      reference_range: lv.referenceRange,
      report_id: lv.report.toString(),
    })),
  };
};
