import dotenv from 'dotenv';
import { z } from 'zod';


dotenv.config();

const envSchema = z.object({
  PORT: z
    .string()
    .default('8000')
    .transform((val) => parseInt(val, 10)),
  MONGODB_URI: z.string({
    required_error: 'MONGODB_URI environment variable is required',
  }).min(1, 'MONGODB_URI cannot be empty'),
  JWT_SECRET: z.string({
    required_error: 'JWT_SECRET environment variable is required',
  }).min(1, 'JWT_SECRET cannot be empty'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  OPENROUTER_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().default('http://127.0.0.1:11434'),
  OLLAMA_MODEL: z.string().default('llama3.2:3b'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables configuration:');
  _env.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = _env.data;
