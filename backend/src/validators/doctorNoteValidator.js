import { z } from 'zod';

export const createDoctorNoteSchema = z.object({
  patient_id: z.string().min(1, 'Patient ID is required'),
  report_id: z.string().optional().nullable(),
  note_text: z.string().min(1, 'Note text is required'),
  note_type: z.enum(['consultation', 'examination', 'followup']).optional().default('consultation'),
});
