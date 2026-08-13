import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { env } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError.js';
import { logger, loggerContext } from '../utils/logger.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn(`Authentication failed: No token provided from IP ${req.ip}`);
    return next(new UnauthorizedError('Authentication token required'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    
    const user = await User.findOne({ email: decoded.sub });
    if (!user) {
      logger.warn(`Authentication failed: User ${decoded.sub} not found`);
      return next(new UnauthorizedError('User not found'));
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    
    const store = loggerContext.getStore();
    if (store) {
      store.userId = req.user.id;
      store.role = req.user.role;
    }

    next();
  } catch (error) {
    logger.warn(`Authentication failed: Invalid or expired token - ${error.message}`);
    return next(new UnauthorizedError('Invalid or expired authentication credentials'));
  }
};

export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      logger.warn(`Authorization failed: User ${req.user?.id} attempted role ${role}`);
      return next(new ForbiddenError(`Unauthorized role: ${role} required`));
    }
    next();
  };
};
