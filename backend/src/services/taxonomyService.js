import { DoctorCategory, DoctorSpecialty, ReportCategory } from '../models/index.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors/AppError.js';

export const getDoctorCategories = async () => {
  const categories = await DoctorCategory.find().sort({ name: 1 });
  return categories.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    description: c.description,
  }));
};

export const getDoctorSpecialties = async (categoryId) => {
  const query = {};
  if (categoryId) {
    query.category = categoryId;
  }

  const specialties = await DoctorSpecialty.find(query).sort({ name: 1 });
  return specialties.map((s) => ({
    id: s._id.toString(),
    name: s.name,
    description: s.description,
    category_id: s.category.toString(),
  }));
};

export const createDoctorSpecialty = async (user, data) => {
  if (user.role !== 'doctor') {
    throw new ForbiddenError('Only doctors can create specialties');
  }

  const { category_id, name, description } = data;
  const trimmedName = (name || '').trim();

  if (!trimmedName) {
    throw new BadRequestError('Specialty name is required');
  }

  const category = await DoctorCategory.findById(category_id);
  if (!category) {
    throw new NotFoundError('Category not found');
  }

  const existing = await DoctorSpecialty.findOne({ category: category_id, name: trimmedName });
  if (existing) {
    return {
      id: existing._id.toString(),
      name: existing.name,
      description: existing.description,
      category_id: existing.category.toString(),
      already_existed: true,
    };
  }

  const specialty = new DoctorSpecialty({
    category: category_id,
    name: trimmedName,
    description: description || null,
  });

  await specialty.save();

  return {
    id: specialty._id.toString(),
    name: specialty.name,
    description: specialty.description,
    category_id: specialty.category.toString(),
    already_existed: false,
  };
};

export const getReportCategories = async () => {
  const categories = await ReportCategory.find().sort({ name: 1 });
  return categories.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    description: c.description,
  }));
};
