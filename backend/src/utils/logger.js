import winston from 'winston';
import { AsyncLocalStorage } from 'node:async_hooks';


export const loggerContext = new AsyncLocalStorage();

const SENSITIVE_KEYS = [
  'password',
  'token',
  'access_token',
  'accesstoken',
  'refreshtoken',
  'refresh_token',
  'jwt',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'credentials',
];


const sanitize = (data) => {
  if (!data) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  const result = {};
  for (const [key, val] of Object.entries(data)) {
    const isSensitive = SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s));
    if (isSensitive) {
      result[key] = '[REDACTED]';
    } else if (typeof val === 'object') {
      result[key] = sanitize(val);
    } else {
      result[key] = val;
    }
  }
  return result;
};


const sanitizeFormat = winston.format((info) => {
  return sanitize(info);
});


const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  sanitizeFormat(),
  winston.format.json()
);


const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  sanitizeFormat(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    
    const store = loggerContext.getStore() || {};
    const mergedMeta = { ...store, ...meta };

    let metaStr = Object.keys(mergedMeta).length ? JSON.stringify(mergedMeta) : '';
    return `[${timestamp}] [${level}]: ${stack || message} ${metaStr}`;
  })
);


const injectContextFormat = winston.format((info) => {
  const store = loggerContext.getStore();
  if (store) {
    Object.assign(info, store);
  }
  return info;
});

const isDev = process.env.NODE_ENV === 'development';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  format: winston.format.combine(
    injectContextFormat(),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: isDev ? consoleFormat : logFormat,
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat,
    }),
  ],
});
