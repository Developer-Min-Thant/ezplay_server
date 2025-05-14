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
const jwt = require('jsonwebtoken');
const { createAdapter } = require('@socket.io/mongo-adapter');
const User = require('./models/user.model');
const ChatMessage = require('./models/chat.model');
const ChatLimit = require('./models/chatlimit.model');
const SocketService = require('./services/socket.service');

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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/downloads', express.static('downloads'));

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, '../../downloads');

if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Create images directory if it doesn't exist
const imagesDir = path.join(__dirname, '../../images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

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
