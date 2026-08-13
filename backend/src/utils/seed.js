import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { DoctorCategory, DoctorSpecialty, ReportCategory, UniversalRange } from '../models/index.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medical_analyzer';

const DEFAULT_DOCTOR_CATEGORIES = [
  'General Physician / Family Doctor',
  'Cardiologist',
  'Neurologist',
  'Neurosurgeon',
  'Orthopedic Doctor',
  'Pediatrician',
  'Gynecologist',
  'Obstetrician',
  'Dermatologist',
  'Ophthalmologist',
  'ENT Specialist',
  'Dentist',
  'Psychiatrist',
  'Psychologist',
  'Gastroenterologist',
  'Pulmonologist',
  'Nephrologist',
  'Urologist',
  'Endocrinologist',
  'Oncologist',
  'Hematologist',
  'Rheumatologist',
  'Infectious Disease Specialist',
  'Allergist / Immunologist',
  'General Surgeon',
  'Plastic Surgeon',
  'Cardiothoracic Surgeon',
  'Vascular Surgeon',
  'Anesthesiologist',
  'Radiologist',
  'Pathologist',
  'Emergency Medicine Doctor',
  'Critical Care / Intensivist',
  'Geriatrician',
  'Sexologist',
  'Andrologist',
  'Fertility Specialist / Reproductive Medicine',
  'Pain Management Specialist',
  'Physiotherapist',
  'Sports Medicine Doctor',
  'Occupational Medicine Doctor',
  'Preventive Medicine Specialist',
  'Nuclear Medicine Specialist',
  'Palliative Care Specialist',
  'Sleep Medicine Specialist',
  'Clinical Geneticist',
  'Addiction Medicine Specialist',
  'Neonatologist',
  'Pediatric Surgeon',
  'Oral & Maxillofacial Surgeon',
  'others'
];

const DEFAULT_REPORT_CATEGORIES = [
  { name: 'Blood Test', description: 'Complete Blood Count, Metabolic Panel, Lipid Panel etc.' },
  { name: 'Urinalysis', description: 'Urine tests and renal filtration reports.' },
  { name: 'Imaging', description: 'X-Ray, MRI, CT Scan, Ultrasound, etc.' },
  { name: 'Cardiology', description: 'ECG, Echocardiogram, and cardiovascular diagnostic reports.' },
  { name: 'Pathology', description: 'Biopsy and tissue analysis reports.' },
  { name: 'General', description: 'General medical examination and physical reports.' }
];

const DEFAULT_UNIVERSAL_RANGES = [
  { parameterName: 'HbA1c', referenceRange: '4.0-5.6', unit: '%', description: 'Glycated hemoglobin' },
  { parameterName: 'Total Cholesterol', referenceRange: '<200', unit: 'mg/dL', description: 'Total blood cholesterol' },
  { parameterName: 'HDL Cholesterol', referenceRange: '>40', unit: 'mg/dL', description: 'High-density lipoprotein cholesterol' },
  { parameterName: 'LDL Cholesterol', referenceRange: '<100', unit: 'mg/dL', description: 'Low-density lipoprotein cholesterol' },
  { parameterName: 'Triglycerides', referenceRange: '<150', unit: 'mg/dL', description: 'Blood triglycerides' },
  { parameterName: 'Haemoglobin', referenceRange: '13.0-17.0', unit: 'g/dL', description: 'Hemoglobin content' },
  { parameterName: 'WBC', referenceRange: '4.0-11.0', unit: '10^3/µL', description: 'White blood cells count' },
  { parameterName: 'RBC', referenceRange: '4.5-5.9', unit: '10^6/µL', description: 'Red blood cells count' },
  { parameterName: 'Platelets', referenceRange: '150-450', unit: '10^3/µL', description: 'Platelets count' },
  { parameterName: 'Glucose', referenceRange: '70-100', unit: 'mg/dL', description: 'Fasting blood glucose' },
  { parameterName: 'TSH', referenceRange: '0.4-4.5', unit: 'µIU/mL', description: 'Thyroid stimulating hormone' },
  { parameterName: 'Creatinine', referenceRange: '0.6-1.2', unit: 'mg/dL', description: 'Kidney filtration marker' },
];

export const seedDatabase = async () => {
  try {
    console.log('Seeding database...');

    
    for (const item of DEFAULT_REPORT_CATEGORIES) {
      const exists = await ReportCategory.findOne({ name: item.name });
      if (!exists) {
        await new ReportCategory(item).save();
        console.log(`Seeded Report Category: ${item.name}`);
      }
    }

    
    for (const name of DEFAULT_DOCTOR_CATEGORIES) {
      let cat = await DoctorCategory.findOne({ name });
      if (!cat) {
        cat = new DoctorCategory({ name });
        await cat.save();
        console.log(`Seeded Doctor Category: ${name}`);
      }
    }

    
    for (const item of DEFAULT_UNIVERSAL_RANGES) {
      const exists = await UniversalRange.findOne({ parameterName: item.parameterName });
      if (!exists) {
        await new UniversalRange(item).save();
        console.log(`Seeded Universal Reference Range: ${item.parameterName}`);
      }
    }

    console.log('Database seeding complete!');
  } catch (error) {
    console.error('Seeding error:', error);
  }
};


if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  mongoose.connect(MONGODB_URI)
    .then(async () => {
      await seedDatabase();
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
