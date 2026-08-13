import jwt from 'jsonwebtoken';
import { User, PatientDoctorAccess, Message } from '../models/index.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';


const onlineUsers = new Map();

const isConnected = async (userId1, userId2) => {
  const access = await PatientDoctorAccess.findOne({
    $or: [
      { patient: userId1, doctor: userId2 },
      { patient: userId2, doctor: userId1 },
    ],
    status: { $in: ['approved', 'accepted'] },
  });
  return access !== null;
};

export const initializeSocket = (io) => {
  
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = await User.findOne({ email: decoded.sub });
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      next();
    } catch (err) {
      logger.warn(`Socket auth failed: ${err.message}`);
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);
    logger.info(`Socket connected: ${userId}`);

    
    socket.broadcast.emit('user_online', { user_id: userId });

    
    socket.on('send_message', async (data, callback) => {
      try {
        const { receiver_id, message_text } = data;

        if (!receiver_id || !message_text?.trim()) {
          return callback?.({ error: 'receiver_id and message_text required' });
        }

        
        const connected = await isConnected(userId, receiver_id);
        if (!connected) {
          return callback?.({ error: 'Not connected to this user' });
        }

        
        const message = new Message({
          sender: userId,
          receiver: receiver_id,
          messageText: message_text.trim(),
        });
        await message.save();

        const msgPayload = {
          id: message._id.toString(),
          sender_id: userId,
          receiver_id: receiver_id,
          message_text: message.messageText,
          is_read: false,
          created_at: message.createdAt.toISOString(),
        };

        
        const receiverSocketId = onlineUsers.get(receiver_id);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receive_message', msgPayload);
        }

        callback?.({ success: true, message: msgPayload });
      } catch (err) {
        logger.error(`Socket send_message error: ${err.message}`);
        callback?.({ error: 'Failed to send message' });
      }
    });

    
    socket.on('typing', (data) => {
      const receiverSocketId = onlineUsers.get(data.receiver_id);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user_typing', { user_id: userId });
      }
    });

    socket.on('stop_typing', (data) => {
      const receiverSocketId = onlineUsers.get(data.receiver_id);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user_stop_typing', { user_id: userId });
      }
    });

    
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      socket.broadcast.emit('user_offline', { user_id: userId });
      logger.info(`Socket disconnected: ${userId}`);
    });
  });
};
