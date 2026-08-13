import { Message, PatientDoctorAccess } from '../models/index.js';
import { ForbiddenError, BadRequestError } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';

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

export const sendMessage = async (user, data) => {
  const { receiver_id, message_text } = data;

  if (!receiver_id || !message_text?.trim()) {
    throw new BadRequestError('receiver_id and message_text are required');
  }

  const connected = await isConnected(user.id, receiver_id);
  if (!connected) {
    throw new ForbiddenError('You can only chat with connected doctors/patients');
  }

  const message = new Message({
    sender: user.id,
    receiver: receiver_id,
    messageText: message_text.trim(),
  });

  await message.save();
  logger.info(`Message sent: sender=${user.id}, receiver=${receiver_id}`);

  return {
    id: message._id.toString(),
    sender_id: message.sender.toString(),
    receiver_id: message.receiver.toString(),
    message_text: message.messageText,
    is_read: message.isRead,
    created_at: message.createdAt.toISOString(),
  };
};

export const getChatHistory = async (user, otherUserId) => {
  const connected = await isConnected(user.id, otherUserId);
  if (!connected) {
    throw new ForbiddenError('You can only view chat with connected doctors/patients');
  }

  const messages = await Message.find({
    $or: [
      { sender: user.id, receiver: otherUserId },
      { sender: otherUserId, receiver: user.id },
    ],
  }).sort({ createdAt: 1 });

  
  await Message.updateMany(
    { sender: otherUserId, receiver: user.id, isRead: false },
    { isRead: true }
  );

  return messages.map((m) => ({
    id: m._id.toString(),
    sender_id: m.sender.toString(),
    receiver_id: m.receiver.toString(),
    message_text: m.messageText,
    is_read: m.isRead,
    created_at: m.createdAt.toISOString(),
  }));
};

export const getConversations = async (user) => {
  
  const sentTo = await Message.distinct('receiver', { sender: user.id });
  const receivedFrom = await Message.distinct('sender', { receiver: user.id });

  const uniqueUserIds = [...new Set([...sentTo.map(String), ...receivedFrom.map(String)])];

  const conversations = [];
  for (const otherId of uniqueUserIds) {
    
    const connected = await isConnected(user.id, otherId);
    if (!connected) continue;

    const lastMessage = await Message.findOne({
      $or: [
        { sender: user.id, receiver: otherId },
        { sender: otherId, receiver: user.id },
      ],
    }).sort({ createdAt: -1 });

    const unreadCount = await Message.countDocuments({
      sender: otherId,
      receiver: user.id,
      isRead: false,
    });

    conversations.push({
      user_id: otherId,
      last_message: lastMessage
        ? {
            message_text: lastMessage.messageText,
            created_at: lastMessage.createdAt.toISOString(),
            is_mine: lastMessage.sender.toString() === user.id,
          }
        : null,
      unread_count: unreadCount,
    });
  }

  
  conversations.sort((a, b) => {
    const aTime = a.last_message ? new Date(a.last_message.created_at) : new Date(0);
    const bTime = b.last_message ? new Date(b.last_message.created_at) : new Date(0);
    return bTime - aTime;
  });

  return conversations;
};
