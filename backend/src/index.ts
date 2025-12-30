import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { healthRouter } from './routes/health.js';
import { projectsRouter } from './routes/projects.js';
import { documentsRouter } from './routes/documents.js';
import { discoveryRouter } from './routes/discovery.js';
import { operationsRouter } from './routes/operations.js';
import { diagramsRouter } from './routes/diagrams.js';
import validationRouter from './routes/validation.js';
import { initializeDatabase } from './database/init.js';

const app = express();

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api', discoveryRouter);
app.use('/api', operationsRouter);
app.use('/api', diagramsRouter);
app.use('/api', validationRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database and start server
async function start() {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { app };
