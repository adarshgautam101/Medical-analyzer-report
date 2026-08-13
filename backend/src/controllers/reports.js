import fs from 'fs';
import * as reportsService from '../services/reportsService.js';
import { sendSuccess } from '../utils/response.js';

export const uploadReport = async (req, res) => {
  const result = await reportsService.uploadReport(req.user, req.file);
  return res.json(result);
};

export const getReports = async (req, res) => {
  const result = await reportsService.getReports(req.user);
  return res.json(result);
};

export const getSummary = async (req, res) => {
  const result = await reportsService.getSummary(req.user);
  return res.json(result);
};

export const getReportDetails = async (req, res) => {
  const result = await reportsService.getReportDetails(req.user, req.params.report_id);
  return res.json(result);
};

export const deleteReport = async (req, res) => {
  const result = await reportsService.deleteReport(req.user, req.params.report_id);
  return res.json(result);
};


