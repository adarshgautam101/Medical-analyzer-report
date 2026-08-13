import * as doctorNotesService from '../services/doctorNotesService.js';

export const createDoctorNote = async (req, res) => {
  const result = await doctorNotesService.createDoctorNote(req.user, req.body);
  return res.json(result);
};

export const getDoctorNotes = async (req, res) => {
  const result = await doctorNotesService.getDoctorNotes(req.user, req.query);
  return res.json(result);
};
