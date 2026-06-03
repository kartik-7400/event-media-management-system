import { PORT, NODE_ENV } from './config/env.js';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import connectDB from './config/db.js';
import { initializeAwsCollection } from './utils/awsHelper.js';

// Route imports
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import mediaRoutes from './routes/media.js';
import notificationRoutes from './routes/notifications.js';

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Attach socket io to request object for route controllers to emit events
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/notifications', notificationRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Event & Media Management Platform API is running...');
});

// Socket connections handler
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Join a personal user room
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`👤 Socket ${socket.id} joined room (User ID): ${userId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

server.listen(PORT, async () => {
  console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
  try {
    await initializeAwsCollection();
  } catch (err) {
    console.error('Failed to initialize AWS Rekognition collection:', err);
  }
});
