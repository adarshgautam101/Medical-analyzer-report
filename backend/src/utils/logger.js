import winston from 'winston';
import { AsyncLocalStorage } from 'node:async_hooks';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const LOGS_DIR = path.resolve(__dirname, '../../logs');

// Ensure logs directory exists synchronously
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Preserve .gitkeep file
const gitkeepPath = path.join(LOGS_DIR, '.gitkeep');
if (!fs.existsSync(gitkeepPath)) {
  try {
    fs.writeFileSync(gitkeepPath, '');
  } catch (_) {}
}

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
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  for (const key of Object.keys(data)) {
    const isSensitive = SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s));
    if (isSensitive) {
      data[key] = '[REDACTED]';
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      data[key] = sanitize(data[key]);
    }
  }
  return data;
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
      filename: path.join(LOGS_DIR, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'combined.log'),
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'exceptions.log'),
      format: logFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'rejections.log'),
      format: logFormat,
    }),
  ],
  exitOnError: false,
});

// Helper: Get summary of log files
export const getLogsSummary = async () => {
  if (!fs.existsSync(LOGS_DIR)) return { files: [], totalSizeBytes: 0 };

  const filenames = await fs.promises.readdir(LOGS_DIR);
  const files = [];
  let totalSizeBytes = 0;

  for (const name of filenames) {
    if (name.startsWith('.')) continue;
    const filePath = path.join(LOGS_DIR, name);
    try {
      const stats = await fs.promises.stat(filePath);
      if (stats.isFile()) {
        totalSizeBytes += stats.size;
        files.push({
          name,
          sizeBytes: stats.size,
          sizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
          lastModified: stats.mtime,
        });
      }
    } catch (_) {}
  }

  return {
    logsDir: LOGS_DIR,
    files,
    totalSizeBytes,
    totalSizeFormatted: `${(totalSizeBytes / 1024).toFixed(2)} KB`,
  };
};

// Helper: Read log entries from specified log file
export const readLogEntries = async (fileName = 'combined.log', options = {}) => {
  const { limit = 100, level = null, search = null } = options;
  const safeFileName = path.basename(fileName);
  const filePath = path.join(LOGS_DIR, safeFileName);

  if (!fs.existsSync(filePath)) {
    return { fileName: safeFileName, entries: [], count: 0 };
  }

  const content = await fs.promises.readFile(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);

  let parsedEntries = lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (_) {
        return { message: line, raw: true };
      }
    })
    .reverse(); // Most recent first

  if (level) {
    parsedEntries = parsedEntries.filter((entry) => entry.level === level.toLowerCase());
  }

  if (search) {
    const searchLower = search.toLowerCase();
    parsedEntries = parsedEntries.filter((entry) =>
      JSON.stringify(entry).toLowerCase().includes(searchLower)
    );
  }

  const sliced = parsedEntries.slice(0, Number(limit));

  return {
    fileName: safeFileName,
    entries: sliced,
    totalCount: parsedEntries.length,
    returnedCount: sliced.length,
  };
};

// Helper: Clear log file
export const clearLogFile = async (fileName) => {
  const safeFileName = path.basename(fileName);
  const filePath = path.join(LOGS_DIR, safeFileName);

  if (fs.existsSync(filePath)) {
    await fs.promises.writeFile(filePath, '', 'utf-8');
    return true;
  }
  return false;
};

