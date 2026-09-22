import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { CONFIG } from './config.js';
import { getDb, persistDb } from './db/database.js';
import { initSocketIO } from './sockets/socketManager.js';

import authRoutes from './routes/authRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();
const server = http.createServer(app);

// Configure Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});
initSocketIO(io);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-team-id',
    'x-team-code',
    'x-session-id',
    'x-admin-request'
  ]
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const database = await getDb();
    const qCount = database.exec('SELECT COUNT(*) as c FROM questions')[0]?.values[0]?.[0] || 0;
    const tCount = database.exec('SELECT COUNT(*) as c FROM teams')[0]?.values[0]?.[0] || 0;
    const aCount = database.exec('SELECT COUNT(*) as c FROM answers')[0]?.values[0]?.[0] || 0;

    res.json({
      status: 'online',
      event: 'NEURAL NEXUS 2026',
      department: 'Department of AI & Data Science',
      counts: {
        questions: qCount,
        teams: tCount,
        answers: aCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);

import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Optional: Serve static client build if built
const clientDistCandidates = [
  path.resolve(__dirname, '..', '..', 'client', 'dist'),
  path.resolve(process.cwd(), 'client', 'dist'),
  path.resolve(process.cwd(), '..', 'client', 'dist')
];
const clientDist = clientDistCandidates.find(p => fs.existsSync(p)) || clientDistCandidates[0];
app.use(express.static(clientDist));
app.get('*', (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Neural Nexus 2026 API Server is running. Client Vite dev server is on port 5173.');
    }
  });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start Server
async function startServer() {
  try {
    // Initializes schema, default admin, and default settings cleanly with ZERO dummy data
    await getDb();

    server.listen(CONFIG.PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 NEURAL NEXUS 2026 - REAL-TIME PARTICIPANT QUIZ PLATFORM`);
      console.log(`🎯 Department of Artificial Intelligence & Data Science`);
      console.log(`🌐 Server running on: http://localhost:${CONFIG.PORT}`);
      console.log(`🔑 Admin credentials: ${CONFIG.ADMIN_USERNAME} / ${CONFIG.ADMIN_PASSWORD}`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down server...');
  persistDb();
  process.exit(0);
});

startServer();
