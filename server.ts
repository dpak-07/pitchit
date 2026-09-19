import http from 'http';
import path from 'path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Server as SocketServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { connectDB } from './server/config/db';
import { seedInitialData } from './server/scripts/seed';
import authRoutes from './server/routes/authRoutes';
import auctionRoutes from './server/routes/auctionRoutes';
import { setupSocketIO } from './server/sockets/socketHandler';
import { errorHandler } from './server/middleware/errorHandler';

const PORT = 3000;

async function bootstrap() {
  const app = express();
  const server = http.createServer(app);

  // Initialize DB (MongoDB or high-performance in-memory fallback)
  await connectDB();
  await seedInitialData();

  // Basic security & parsing middlewares
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // Socket.IO setup on same HTTP server instance
  const io = new SocketServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });
  setupSocketIO(io);

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/auctions', auctionRoutes);

  // Error handling middleware
  app.use(errorHandler);

  // Vite development middleware or production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ Football Auction Platform running at http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch(err => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
