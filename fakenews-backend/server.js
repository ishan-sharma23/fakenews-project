const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const http = require('http');
const socketIO = require('socket.io');
const { initializeSocketEvents } = require('./services/socketEvents');
const { startScheduler } = require('./services/newsFetcher');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.IO configuration
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

console.log('[Socket.IO] Server initialized with CORS origin:', process.env.FRONTEND_URL || 'http://localhost:3000');

// Initialize Socket.IO events
initializeSocketEvents(io);

// Socket.IO error handler
io.engine.on('connection_error', (err) => {
  console.error('[Socket.IO] Connection error:', err);
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/analyze', require('./routes/analyze'));
app.use('/api/trending', require('./routes/trending'));

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'FakeNews API is running' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MongoDB connected: ${process.env.MONGO_URI ? 'Yes' : 'No'}`);
  console.log(`Google OAuth configured: ${process.env.GOOGLE_CLIENT_ID ? 'Yes' : 'No'}`);
  if (process.env.GOOGLE_CLIENT_ID) {
    console.log(`Google Client ID: ${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...`);
  }
  // Start news fetcher scheduler
  startScheduler(io);
});
