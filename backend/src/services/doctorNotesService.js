import { DoctorNote, PatientDoctorAccess } from '../models/index.js';
import { ForbiddenError } from '../errors/AppError.js';

const checkDoctorAccess = async (patientId, doctorId) => {
  const allowedStatuses = ['approved', 'accepted'];
  const access = await PatientDoctorAccess.findOne({
    patient: patientId,
    doctor: doctorId,
    status: { $in: allowedStatuses },
  });
  return access !== null;
};

export const createDoctorNote = async (user, data) => {
  if (user.role !== 'doctor') {
    throw new ForbiddenError('Only doctors can create notes');
  }

  const { patient_id, report_id, note_text, note_type } = data;

  const hasAccess = await checkDoctorAccess(patient_id, user.id);
  if (!hasAccess) {
    throw new ForbiddenError('Access not granted');
  }

  const note = new DoctorNote({
    doctor: user.id,
    patient: patient_id,
    report: report_id || null,
    noteText: note_text,
    noteType: note_type || 'consultation',
  });

  await note.save();

  return {
    id: note._id.toString(),
    patient_id: note.patient.toString(),
    report_id: note.report ? note.report.toString() : null,
    note_text: note.noteText,
    note_type: note.noteType,
    created_at: note.createdAt.toISOString(),
  };
};

export const getDoctorNotes = async (user, { patient_id, report_id }) => {
  const query = {};

  if (user.role === 'doctor') {
    const approvedAccess = await PatientDoctorAccess.find({
      doctor: user.id,
      status: { $in: ['approved', 'accepted'] },
    });
    const patientIds = approvedAccess.map((access) => access.patient);

    query.doctor = user.id;
    query.patient = { $in: patientIds };
  } else {
    query.patient = user.id;
  }

  if (patient_id) {
    query.patient = patient_id;
  }

  if (report_id) {
    query.report = report_id;
  }

  const notes = await DoctorNote.find(query).sort({ createdAt: -1 });

  return notes.map((n) => ({
    id: n._id.toString(),
    patient_id: n.patient.toString(),
    report_id: n.report ? n.report.toString() : null,
    note_text: n.noteText,
    note_type: n.noteType,
    created_at: n.createdAt.toISOString(),
  }));
};
