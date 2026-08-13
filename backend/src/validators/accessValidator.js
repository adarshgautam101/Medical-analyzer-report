import { z } from 'zod';

export const requestDoctorAccessSchema = z.object({
  doctor_id: z.string().min(1, 'Doctor ID is required'),
});
