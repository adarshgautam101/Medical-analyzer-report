import { logger } from '../utils/logger.js';

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
