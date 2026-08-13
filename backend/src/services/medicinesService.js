import { Medicine, PatientDoctorAccess } from '../models/index.js';
import { NotFoundError } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';

export const createMedicine = async (user, data) => {
  const { name, dosage, frequency, start_date, end_date, status } = data;

  const medicine = new Medicine({
    user: user.id,
    name,
    dosage,
    frequency,
    startDate: new Date(start_date),
    endDate: end_date ? new Date(end_date) : null,
    status,
  });

  await medicine.save();
  logger.info(`Medicine created: user=${user.id}, name=${medicine.name}`);

  return {
    id: medicine._id.toString(),
    name: medicine.name,
    dosage: medicine.dosage,
    frequency: medicine.frequency,
    start_date: medicine.startDate.toISOString().split('T')[0],
    end_date: medicine.endDate ? medicine.endDate.toISOString().split('T')[0] : null,
    status: medicine.status,
  };
};

export const getMedicines = async (user) => {
  const medicines = await Medicine.find({ user: user.id }).sort({ createdAt: -1 });

  return medicines.map((m) => ({
    id: m._id.toString(),
    name: m.name,
    dosage: m.dosage,
    frequency: m.frequency,
    start_date: m.startDate.toISOString().split('T')[0],
    end_date: m.endDate ? m.endDate.toISOString().split('T')[0] : null,
    status: m.status,
  }));
};

export const updateMedicine = async (user, medicineId, data) => {
  const { name, dosage, frequency, start_date, end_date, status } = data;

  let medicine;
  if (user.role === 'doctor') {
    
    medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      throw new NotFoundError('Medicine not found');
    }
    const access = await PatientDoctorAccess.findOne({
      doctor: user.id,
      patient: medicine.user,
      status: { $in: ['approved', 'accepted'] },
    });
    if (!access) {
      throw new NotFoundError('Medicine not found or access denied');
    }
  } else {
    medicine = await Medicine.findOne({ _id: medicineId, user: user.id });
    if (!medicine) {
      throw new NotFoundError('Medicine not found');
    }
  }

  medicine.name = name;
  medicine.dosage = dosage;
  medicine.frequency = frequency;
  medicine.startDate = new Date(start_date);
  medicine.endDate = end_date ? new Date(end_date) : null;
  medicine.status = status;

  await medicine.save();
  logger.info(`Medicine updated: editor=${user.id}, patient=${medicine.user}, id=${medicineId}, name=${medicine.name}`);

  return {
    id: medicine._id.toString(),
    name: medicine.name,
    dosage: medicine.dosage,
    frequency: medicine.frequency,
    start_date: medicine.startDate.toISOString().split('T')[0],
    end_date: medicine.endDate ? medicine.endDate.toISOString().split('T')[0] : null,
    status: medicine.status,
  };
};

export const deleteMedicine = async (user, medicineId) => {
  const result = await Medicine.deleteOne({ _id: medicineId, user: user.id });
  if (result.deletedCount === 0) {
    throw new NotFoundError('Medicine not found');
  }

  logger.info(`Medicine deleted: user=${user.id}, id=${medicineId}`);
  return { message: 'Medicine deleted successfully' };
};
