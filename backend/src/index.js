import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { seedDatabase } from './utils/seed.js';
import { initializeSocket } from './utils/socketHandler.js';


import authRouter from './routes/auth.js';
import reportsRouter from './routes/reports.js';
import labValuesRouter from './routes/labValues.js';
import medicinesRouter from './routes/medicines.js';
import doctorNotesRouter from './routes/doctorNotes.js';
import accessRouter from './routes/access.js';
import profilesRouter from './routes/profiles.js';
import taxonomyRouter from './routes/taxonomy.js';
import simulateRouter from './routes/simulate.js';
import analyticsRouter from './routes/analytics.js';
import dashboardRouter from './routes/dashboard.js';
import chatRouter from './routes/chat.js';
import logsRouter from './routes/logs.js';


const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads');


await fs.promises.mkdir(uploadDir, { recursive: true });


app.use(cors());
app.use(express.json());
app.use(requestLogger);


app.use('/uploads', express.static(uploadDir));


app.use('/api/auth', authRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/lab-values', labValuesRouter);
app.use('/api/medicines', medicinesRouter);
app.use('/api/doctor-notes', doctorNotesRouter);
app.use('/api/simulate', simulateRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/logs', logsRouter);


app.use('/api', accessRouter);
app.use('/api', profilesRouter);
app.use('/api', taxonomyRouter);
app.use('/api/chat', chatRouter);


app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});


app.use(errorHandler);


logger.info(`OPENROUTER_API_KEY loaded: ${!!env.OPENROUTER_API_KEY}`);
logger.info(`API key length: ${env.OPENROUTER_API_KEY?.length || 0}`);
logger.info(`Ollama integration active. URL: ${env.OLLAMA_BASE_URL}, Model: ${env.OLLAMA_MODEL}`);

logger.info('Connecting to MongoDB database...');


mongoose.connection.on('error', (err) => {
  logger.error('MongoDB database connection error:', err);
});
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB database disconnected!');
});
mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB database reconnected!');
});

mongoose
  .connect(env.MONGODB_URI)
  .then(async () => {
    logger.info('MongoDB connected successfully!');
    await seedDatabase();
    initializeSocket(io);
    httpServer.listen(env.PORT, () => {
      logger.info(`Express server running on port ${env.PORT} [env: ${env.NODE_ENV}]`);
    });
  })
  .catch((err) => {
    logger.error('MongoDB connection failure:', err);
    process.exit(1);
  });
