import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err instanceof ZodError) {
    statusCode = 400;
    const details = err.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`).join(', ');
    message = `Validation Error: ${details}`;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ID format: ${err.value}`;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((val) => val.message).join(', ');
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File size exceeds maximum limit of 10MB'
      : `Upload error: ${err.message}`;
  }

  if (statusCode >= 500) {
    logger.error(`[Unhandled Error] ${req.method} ${req.originalUrl}:`, err);
    if (env.NODE_ENV === 'production') {
      message = 'Internal Server Error';
    }
  } else {
    logger.warn(`[Client Error] ${req.method} ${req.originalUrl} (${statusCode}): ${message}`);
  }

  return res.status(statusCode).json({
    success: false,
    code: err.code || undefined,
    message,
    error: {
      message,
      statusCode,
      code: err.code || undefined,
      requestId: req.id,
    },
    requestId: req.id,
    detail: message, 
  });
};
