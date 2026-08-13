import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  full_name: z.string().min(1, 'Full name is required'),
  role: z.enum(['patient', 'doctor']),
  doctor_category_id: z.string().optional().nullable(),
  doctor_specialty_id: z.string().optional().nullable(),
  new_specialty_name: z.string().optional().nullable(),
  new_specialty_description: z.string().optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
