import * as analyticsService from '../services/analyticsService.js';
import { logger } from '../utils/logger.js';
import { BadRequestError } from '../errors/AppError.js';

export const getTrendChart = async (req, res) => {
  const svg = await analyticsService.getTrendChart(req.user, {
    parameter_name: req.params.parameter_name,
    start_date: req.query.start_date,
    end_date: req.query.end_date,
  });
  res.setHeader('Content-Type', 'image/svg+xml');
  return res.status(200).send(svg);
};

export const getComparisonChart = async (req, res) => {
  const svg = await analyticsService.getComparisonChart(req.user, {
    parameter_names: req.query.parameter_names,
  });
  res.setHeader('Content-Type', 'image/svg+xml');
  return res.status(200).send(svg);
};

export const getHealthSummaryChart = async (req, res) => {
  const svg = await analyticsService.getHealthSummaryChart(req.user);
  res.setHeader('Content-Type', 'image/svg+xml');
  return res.status(200).send(svg);
};

export const getCorrelationChart = async (req, res) => {
  const svg = await analyticsService.getCorrelationChart(req.user);
  res.setHeader('Content-Type', 'image/svg+xml');
  return res.status(200).send(svg);
};

export const getHealthSummaryJson = async (req, res) => {
  const result = await analyticsService.getHealthSummaryJson(req.user);
  return res.json(result);
};

export const getCorrelationJson = async (req, res) => {
  const result = await analyticsService.getCorrelationJson(req.user);
  return res.json(result);
};

export const getPatientAiChat = async (req, res) => {
  const { patientId } = req.params;
  const { messages } = req.body;

  if (!patientId || typeof patientId !== 'string') {
    throw new BadRequestError('Invalid patient ID');
  }

  if (!messages || !Array.isArray(messages)) {
    throw new BadRequestError('Messages must be a non-empty array');
  }

  if (messages.length > 20) {
    throw new BadRequestError('Conversation history is too long (maximum 20 messages)');
  }

  const validatedMessages = [];
  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') {
      throw new BadRequestError('Invalid message object');
    }
    if (msg.role !== 'user' && msg.role !== 'assistant') {
      throw new BadRequestError('Message role must be either "user" or "assistant"');
    }
    if (typeof msg.content !== 'string' || msg.content.trim() === '') {
      throw new BadRequestError('Message content must be a non-empty string');
    }
    if (msg.content.length > 1000) {
      throw new BadRequestError('Message exceeds maximum limit of 1000 characters');
    }
    validatedMessages.push({
      role: msg.role,
      content: msg.content.trim(),
    });
  }

  const startTime = Date.now();
  logger.info(`[AnalyticsController] AI Chat request started for patient ID: ${patientId}`);

  try {
    const result = await analyticsService.getPatientAiChat(req.user, patientId, validatedMessages);
    const duration = Date.now() - startTime;
    logger.info(`[AnalyticsController] AI Chat request completed successfully for patient ID: ${patientId} (Duration: ${duration}ms)`);
    return res.status(200).json(result);
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error(`[AnalyticsController] AI Chat request failed for patient ID: ${patientId} (Duration: ${duration}ms) - Error: ${err.message}`);
    throw err;
  }
};
