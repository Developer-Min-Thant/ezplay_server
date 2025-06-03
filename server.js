const express = require('express');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const { createAdapter } = require('@socket.io/mongo-adapter');
const rateLimit = require('express-rate-limit');
const SocketService = require('./services/socket.service');
const { initSupabaseCron } = require('./utils/supabaseCron');

// Import routes
const routes = require('./routes/index');

// Load environment variables
dotenv.config();

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Rate limiting middleware
const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { success: false, message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 login/register attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' }
});

const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Limit each IP to 20 login/register attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' }
});

const downloadLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 50, // Limit each IP to 20 download requests per 30 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many download requests, please try again later.' }
});

const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit each IP to 50 chat requests per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many chat requests, please try again later.' }
});

// Middleware
app.set('trust proxy', 'loopback');
app.use(cors(
  {origin: "*"}
));
app.use(express.json());
app.use(express.static('public'));
app.use('/downloads', express.static('downloads'));

// Create downloads directory if it doesn't exist
const downloadsDir = path.join('/var/www/assets', 'downloads');
// const downloadsDir = path.join(__dirname, 'downloads');

if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}


// Apply rate limiters to specific routes
app.use('/api/user', authLimiter); // Auth routes
app.use('/api/admin', authLimiter); // Admin auth routes
app.use('/api/download', downloadLimiter); // Download routes
app.use('/api/chat', chatLimiter); // Chat routes

// Apply default rate limiter to all routes
app.use(defaultLimiter);

// Setup API routes
app.use('/api', routes);

// Clean up old downloads (files older than 30 minutes)
setInterval(() => {
  fs.readdir(downloadsDir, (err, files) => {
    if (err) return;
    
    const now = Date.now();
    const oneHour = 30 * 60 * 1000;
    
    files.forEach(file => {
      const filePath = path.join(downloadsDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        
        if (now - stats.mtimeMs > oneHour) {
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
}, 30 * 60 * 1000); // Run every 30 minutes

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Set up Socket.IO MongoDB adapter for cross-server messaging
    const adapterCollection = process.env.ADAPTER_COLLECTION;
    if (adapterCollection) {
      try {
        const db = mongoose.connection.db;
        // Create capped collection for the adapter if it doesn't exist
        try {
          await db.createCollection(adapterCollection, {
            capped: true,
            size: 1e6
          });
          console.log(`Created capped collection: ${adapterCollection}`);
        } catch (error) {
          console.log(`Collection already exists: ${adapterCollection}`);
        }

        // Set up the MongoDB adapter
        const mongoCollection = db.collection(adapterCollection);
        io.adapter(createAdapter(mongoCollection));
        console.log('Socket.IO MongoDB adapter configured successfully');
      } catch (error) {
        console.error('Error configuring Socket.IO MongoDB adapter:', error);
      }
    }
    
    // Initialize Socket.IO service
    const socketService = new SocketService(io);
    socketService.initialize();
    
    // Initialize Supabase cron job
    initSupabaseCron();

    // Start server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
