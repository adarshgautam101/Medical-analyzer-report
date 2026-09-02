import { HfInference } from '@huggingface/inference';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export const callHfChat = async (messages) => {
  if (process.env.SKIP_HF === 'true' || process.env.SKIP_OLLAMA === 'true' || process.env.SKIP_AI === 'true') {
    return 'AI chat skipped in test mode.';
  }
  if (!env.HF_TOKEN) {
    throw new Error('HF_TOKEN environment variable is not configured on backend.');
  }

  const timeoutMs = env.HF_TIMEOUT_MS || 45000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    logger.info(`[HuggingFaceChat] Sending chat request to model: ${env.HF_MODEL}...`);
    const hf = new HfInference(env.HF_TOKEN);
    const response = await hf.chatCompletion({
      model: env.HF_MODEL,
      messages: messages,
      temperature: 0.1,
      max_tokens: 300,
      provider: 'featherless-ai',
    });

    const reply = response?.choices?.[0]?.message?.content;
    
    if (typeof reply !== 'string' || reply.trim() === '') {
      throw new Error('Hugging Face returned empty or malformed message content.');
    }

    logger.info('[HuggingFaceChat] Response generated successfully.');
    return reply;
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.error(`[HuggingFaceChat] Request timed out (${timeoutMs}ms limit reached).`);
      throw new Error('Timeout error connecting to AI service.');
    }
    logger.error(`[HuggingFaceChat] API connection error: ${error.message}`);
    throw new Error('The AI service is temporarily unavailable. Please try again.');
  } finally {
    clearTimeout(timeoutId);
  }
};

export const callOllamaChat = callHfChat;
