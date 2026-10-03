import express from 'express';
import http from 'http';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { corsOptions } from './config/cors.js';
import { globalRateLimiter } from './middleware/rateLimiterMiddleware.js';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';
import apiRoutes from './routes/index.js';
import { initSocketIO } from './sockets/socketManager.js';

const app = express();
const server = http.createServer(app);

// 1. Core Security & Request Parsing Middlewares
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(env.COOKIE_SECRET));
app.use(globalRateLimiter);

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 2. Mount API Routes
app.use('/api', apiRoutes);

// 3. Centralized Error & 404 Handlers
app.use(notFoundHandler);
app.use(errorHandler);

// 4. Initialize Socket.IO
initSocketIO(server);

// 5. Start Server after Database Connection
const startServer = async () => {
  await connectDB();

  server.listen(env.PORT, () => {
    console.log(`===================================================`);
    console.log(`🚀 SecureConnect Backend Server is Live with Socket.IO!`);
    console.log(`📡 Environment: ${env.NODE_ENV}`);
    console.log(`🔗 API Base URL: http://localhost:${env.PORT}/api`);
    console.log(`🌐 Health Check: http://localhost:${env.PORT}/api/health`);
    console.log(`===================================================`);
  });
};

startServer().catch(err => {
  console.error('[Server Initialization Error]:', err);
  process.exit(1);
});

