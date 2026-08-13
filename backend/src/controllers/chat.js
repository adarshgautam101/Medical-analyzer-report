import * as chatService from '../services/chatService.js';

export const sendMessage = async (req, res) => {
  const result = await chatService.sendMessage(req.user, req.body);
  return res.json(result);
};

export const getChatHistory = async (req, res) => {
  const result = await chatService.getChatHistory(req.user, req.params.user_id);
  return res.json(result);
};

export const getConversations = async (req, res) => {
  const result = await chatService.getConversations(req.user);
  return res.json(result);
};
