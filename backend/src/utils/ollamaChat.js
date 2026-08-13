import { env } from '../config/env.js';
import { logger } from './logger.js';

export const callOllamaChat = async (messages) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    logger.info(`[OllamaChat] Sending chat request to local model: ${env.OLLAMA_MODEL}...`);
    const response = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        messages: messages,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const reply = data.message?.content;
    
    if (typeof reply !== 'string' || reply.trim() === '') {
      throw new Error('Ollama returned empty or malformed message content.');
    }

    logger.info('[OllamaChat] Response generated successfully.');
    return reply;
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.error('[OllamaChat] Request timed out (60-second limit reached).');
      throw new Error('Timeout error connecting to AI service.');
    }
    logger.error(`[OllamaChat] API connection error: ${error.message}`);
    throw new Error('The AI service is temporarily unavailable. Please try again.');
  } finally {
    clearTimeout(timeoutId);
  }
};
