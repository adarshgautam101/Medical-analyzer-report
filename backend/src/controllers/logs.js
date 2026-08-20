import path from 'node:path';
import fs from 'node:fs';
import { logger, getLogsSummary, readLogEntries, clearLogFile, LOGS_DIR } from '../utils/logger.js';

export const logFrontendEvent = async (req, res) => {
  const { level, message, stack, route, userId, requestId, timestamp, ...extra } = req.body;

  const logMeta = {
    frontend: true,
    route,
    userId,
    requestId,
    clientTimestamp: timestamp,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    ...extra,
  };

  const formattedMsg = `[Frontend] ${message}`;

  if (level === 'error') {
    logger.error(formattedMsg, { ...logMeta, stack });
  } else if (level === 'warn') {
    logger.warn(formattedMsg, logMeta);
  } else if (level === 'debug') {
    logger.debug(formattedMsg, logMeta);
  } else {
    logger.info(formattedMsg, logMeta);
  }

  return res.status(200).json({ success: true });
};

// GET /api/logs/summary
export const getLogsSummaryController = async (req, res, next) => {
  try {
    const summary = await getLogsSummary();
    return res.status(200).json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

// GET /api/logs/entries?file=combined.log&limit=100&level=error&search=keyword
export const getLogEntriesController = async (req, res, next) => {
  try {
    const { file = 'combined.log', limit = 100, level, search } = req.query;
    const result = await readLogEntries(file, { limit, level, search });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// GET /api/logs/download/:fileName
export const downloadLogFileController = async (req, res, next) => {
  try {
    const safeFileName = path.basename(req.params.fileName);
    const filePath = path.join(LOGS_DIR, safeFileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Log file not found' });
    }

    return res.download(filePath, safeFileName);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/logs/:fileName
export const clearLogFileController = async (req, res, next) => {
  try {
    const safeFileName = path.basename(req.params.fileName);
    const success = await clearLogFile(safeFileName);

    if (!success) {
      return res.status(404).json({ success: false, error: 'Log file not found' });
    }

    logger.info(`Log file ${safeFileName} was cleared by user ${req.user?.id || 'admin'}`);
    return res.status(200).json({ success: true, message: `Cleared ${safeFileName}` });
  } catch (err) {
    next(err);
  }
};

