import crypto from 'node:crypto';
import { logger, loggerContext } from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  const startTime = process.hrtime();
  
  
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('x-request-id', requestId);

  
  const contextStore = {
    requestId,
    ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  };

  req.logContext = contextStore;

  
  loggerContext.run(contextStore, () => {
    
    res.on('finish', () => {
      const diff = process.hrtime(startTime);
      const durationMs = Math.round(diff[0] * 1e3 + diff[1] * 1e-6);

      
      if (req.user) {
        contextStore.userId = req.user.id;
        contextStore.role = req.user.role;
      }

      const logData = {
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        duration: `${durationMs}ms`,
      };

      if (res.statusCode >= 500) {
        logger.error(`API Request Failed: ${req.method} ${logData.path} - Status: ${res.statusCode}`, logData);
      } else if (res.statusCode >= 400) {
        logger.warn(`API Request Warning: ${req.method} ${logData.path} - Status: ${res.statusCode}`, logData);
      } else {
        logger.info(`API Request Success: ${req.method} ${logData.path} - Status: ${res.statusCode}`, logData);
      }
    });

    next();
  });
};
