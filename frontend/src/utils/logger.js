const LOG_ENDPOINT = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') + '/api/logs';

const sendLogToBackend = async (level, message, stack = null, extra = {}) => {
  try {
    let userId = undefined;
    try {
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        userId = user.id;
      }
    } catch (_) {}

    const payload = {
      level,
      message,
      stack,
      route: window.location.pathname,
      userId,
      timestamp: new Date().toISOString(),
      ...extra,
    };

    
    fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('token') || ''}`,
      },
      body: JSON.stringify(payload),
    }).catch(() => {
      
    });
  } catch (err) {
    
  }
};

const isDev = import.meta.env.MODE === 'development';

export const logger = {
  debug(message, ...args) {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
  info(message, ...args) {
    if (isDev) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  warn(message, ...args) {
    if (isDev) {
      console.warn(`[WARN] ${message}`, ...args);
    } else {
      sendLogToBackend('warn', message, null, { args });
    }
  },
  error(message, error = null, extra = {}) {
    if (isDev) {
      console.error(`[ERROR] ${message}`, error, extra);
    }
    
    let stack = null;
    let errorMsg = message;
    if (error instanceof Error) {
      stack = error.stack;
      errorMsg = `${message}: ${error.message}`;
    } else if (error && typeof error === 'object') {
      errorMsg = `${message}: ${JSON.stringify(error)}`;
    } else if (error) {
      errorMsg = `${message}: ${String(error)}`;
    }
    
    sendLogToBackend('error', errorMsg, stack, extra);
  },
};

export default logger;
