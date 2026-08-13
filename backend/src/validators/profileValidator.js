import { z } from 'zod';

const preprocessNumber = (val) => {
  if (val === undefined) return undefined;
  if (val === '' || val === null) return null;
  const parsed = Number(val);
  return isNaN(parsed) ? val : parsed;
};

export const updateDoctorProfileSchema = z.object({
  degrees: z.string().optional().nullable(),
  specialization: z.string().optional().nullable(),
  experience_years: z.preprocess(preprocessNumber, z.number().optional().nullable()),
  license_number: z.string().optional().nullable(),
  license_issuing_authority: z.string().optional().nullable(),
  clinic_name: z.string().optional().nullable(),
  clinic_address: z.string().optional().nullable(),
  clinic_phone: z.string().optional().nullable(),
  clinic_email: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  doctor_category_id: z.string().optional().nullable(),
  other_category_name: z.string().optional().nullable(),
  visible_fields: z.any().optional().nullable(),
}).passthrough();

export const updatePatientProfileSchema = z.object({
  age: z.preprocess(preprocessNumber, z.number().optional().nullable()),
  gender: z.string().optional(),
  height_cm: z.preprocess(preprocessNumber, z.number().optional().nullable()),
  weight_kg: z.preprocess(preprocessNumber, z.number().optional().nullable()),
  blood_group: z.string().optional(),
  allergies: z.string().optional(),
  chronic_conditions: z.string().optional(),
  lifestyle_indicators: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
});

