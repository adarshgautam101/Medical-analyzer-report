import { z } from 'zod';

export const createDoctorSpecialtySchema = z.object({
  category_id: z.string().min(1, 'Category ID is required'),
  name: z.string().min(1, 'Specialty name is required'),
  description: z.string().optional().nullable(),
});
