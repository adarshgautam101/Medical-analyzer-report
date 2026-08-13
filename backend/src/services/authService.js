import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, DoctorCategory, DoctorSpecialty } from '../models/index.js';
import { env } from '../config/env.js';
import { BadRequestError, UnauthorizedError } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';

const ACCESS_TOKEN_EXPIRE_MINUTES = parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '30', 10);

export const registerUser = async (data) => {
  const { email, password, full_name, role, doctor_category_id, doctor_specialty_id, new_specialty_name, new_specialty_description } = data;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new BadRequestError('Email already registered');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  let docCategoryId = null;
  let docSpecialtyId = null;

  if (role === 'doctor') {
    if (!doctor_category_id) {
      throw new BadRequestError('Doctors must select a clinical category');
    }

    const cat = await DoctorCategory.findById(doctor_category_id);
    if (!cat) {
      throw new BadRequestError('Invalid clinical category');
    }

    docCategoryId = cat._id;

    const trimmedNewSpecialty = (new_specialty_name || '').trim();
    if (trimmedNewSpecialty) {
      let spec = await DoctorSpecialty.findOne({ category: docCategoryId, name: trimmedNewSpecialty });
      if (spec) {
        docSpecialtyId = spec._id;
      } else {
        spec = new DoctorSpecialty({
          category: docCategoryId,
          name: trimmedNewSpecialty,
          description: new_specialty_description || null,
        });
        await spec.save();
        docSpecialtyId = spec._id;
      }
    } else if (doctor_specialty_id) {
      const spec = await DoctorSpecialty.findOne({ _id: doctor_specialty_id, category: docCategoryId });
      if (!spec) {
        throw new BadRequestError('Specialty does not belong to the selected category');
      }
      docSpecialtyId = spec._id;
    }
    
  }

  const user = new User({
    email,
    passwordHash,
    fullName: full_name,
    role,
    doctorCategory: docCategoryId,
    doctorSpecialty: docSpecialtyId,
  });

  await user.save();

  const token = jwt.sign(
    { sub: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m` }
  );

  logger.info(`User registered successfully: ${user.email} (${user.role})`);

  return {
    access_token: token,
    token_type: 'bearer',
    user: { id: user._id.toString(), email: user.email, role: user.role },
  };
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) {
    logger.warn(`Failed login attempt for non-existent email: ${email}`);
    throw new UnauthorizedError('Invalid credentials');
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    logger.warn(`Failed login attempt for email: ${email}`);
    throw new UnauthorizedError('Invalid credentials');
  }

  const token = jwt.sign(
    { sub: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m` }
  );

  logger.info(`User logged in successfully: ${user.email}`);

  return {
    access_token: token,
    token_type: 'bearer',
    user: { id: user._id.toString(), email: user.email, role: user.role },
  };
};
