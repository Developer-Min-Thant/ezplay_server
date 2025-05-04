/**
 * Socket.IO service for chat functionality
 */
const ChatMessage = require('../models/chat.model');
const ChatLimit = require('../models/chatlimit.model');
const jwt = require('jsonwebtoken');

// Socket event constants
const EVENTS = {
  // Server emits
  PREVIOUS_MESSAGES: 'previous messages',
  CHAT_MESSAGE: 'chat message',
  ERROR: 'error',
  USER_STATUS: 'user status',
  MESSAGE_READ: 'message read',
  TYPING: 'typing',
  
  // Client emits
  JOIN: 'join',
  READ_MESSAGE: 'read message',
  DISCONNECT: 'disconnect',
};
class SocketService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
  }

  /**
   * Initialize socket event handlers
   */
  initialize() {
    // Socket.IO authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error: Token required'));
        }
        
        // Normal JWT verification for real tokens
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          
          socket.user = { isAdmin: decoded.role === 'admin', uid: decoded.uid };
          next();
        } catch (jwtError) {
          return next(new Error('Authentication error: Invalid token'));
        }
      } catch (error) {
        return next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id} ${socket.user.uid}`);
      this.connectedUsers.set(socket.id.toString(), socket.user.uid);
      
      // Send online status to all connected users
      // this.io.emit(EVENTS.USER_STATUS, {
      //   uid: socket.user.uid,
      //   status: 'online'
      // });
      
      this.setupEventListeners(socket);
    });
  }

  /**
   * Set up event listeners for the socket
   * @param {Object} socket - Socket.IO socket object
   */
  setupEventListeners(socket) {
    // Join a chat room (using uid as room name)
    socket.on(EVENTS.JOIN, (uid) => {
      socket.join(uid);
      console.log(`User ${socket.user.uid} joined room: ${uid}`);
      
      // Send previous messages
      this.sendPreviousMessages(socket, socket.user.uid);
    });
    
    // Handle chat messages
    socket.on(EVENTS.CHAT_MESSAGE, async (data) => {
      try {
        await this.handleChatMessage(socket, data);
      } catch (error) {
        console.error('Error handling chat message:', error);
        socket.emit(EVENTS.ERROR, { message: 'Error sending message' });
      }
    });
    
    // Handle typing indicator
    socket.on(EVENTS.TYPING, (data) => {
      const { uid, isTyping } = data;
      socket.to(uid).emit(EVENTS.TYPING, { 
        uid: socket.user.uid, 
        isTyping 
      });
    });
    
    // Handle read receipts
    socket.on(EVENTS.READ_MESSAGE, async (data) => {
      const { uid, messageId } = data;
      // Broadcast to the room that the message has been read
      socket.to(uid).emit(EVENTS.MESSAGE_READ, { 
        uid: socket.user.uid, 
        messageId 
      });
    });
    
    // Handle disconnect
    socket.on(EVENTS.DISCONNECT, () => {
      console.log(`User disconnected: ${socket.user.uid}`);
      this.connectedUsers.delete(socket.user.uid.toString());
      
      // Send offline status to all connected users
      this.io.emit(EVENTS.USER_STATUS, {
        uid: socket.user.uid,
        status: 'offline'
      });
    });
  }

  /**
   * Send previous chat messages to the user
   * @param {Object} socket - Socket.IO socket object
   * @param {String} uid - User ID / room name
   */
  async sendPreviousMessages(socket, uid) {
    try {
      const chatMessages = await ChatMessage.find({ uid })
        .sort({ createdAt: -1 })
        .limit(50);
      
      if (chatMessages.length > 0) {
        socket.emit(EVENTS.PREVIOUS_MESSAGES, chatMessages.reverse());
      }

    } catch (error) {
      console.error('Error fetching previous messages:', error);
    }
  }

  /**
   * Handle incoming chat message
   * @param {Object} socket - Socket.IO socket object
   * @param {Object} data - Message data
   */
  async handleChatMessage(socket, data) {
    const { uid, message, sender, isAutoReply, imagePath, pricingPlan } = data;
    const isAdmin = socket.user.isAdmin;
    
    // Handle chat limits
    let chatLimit = await ChatLimit.findOne({ uid });
    if (!chatLimit) {
      chatLimit = await ChatLimit.create({ uid });
    }
    
    if (!isAdmin) {
      chatLimit.messageCount += 1;
      if (chatLimit.messageCount > 5) {
        socket.emit(EVENTS.ERROR, { 
          message: "Please wait for admin to reply before sending more." 
        });
        return;
      }
    }
    
    // If admin sends a message, reset limits
    if (isAdmin) {
      chatLimit.messageCount = 0;
    }
    
    await chatLimit.save();
    
    // Create and save the chat message
    const chatMessage = await ChatMessage.create({
      uid,
      message,
      sender,
      isAdmin : isAdmin || isAutoReply,
      imagePath,
      pricingPlan
    });
    
    // Broadcast the message to the room
    this.io.to(uid).emit(EVENTS.CHAT_MESSAGE, chatMessage);
    
    return chatMessage;
  }

  /**
   * Get a user's socket ID by their user ID
   * @param {String} userId - User ID
   * @returns {String|null} Socket ID or null if not found
   */
  getUserSocketId(userId) {
    return this.connectedUsers.get(userId.toString()) || null;
  }

  /**
   * Check if a user is online
   * @param {String} userId - User ID
   * @returns {Boolean} True if user is online
   */
  isUserOnline(userId) {
    return this.connectedUsers.has(userId.toString());
  }

  /**
   * Send a direct message to a specific user
   * @param {String} userId - User ID
   * @param {String} event - Event name
   * @param {Object} data - Message data
   */
  sendToUser(userId, event, data) {
    const socketId = this.getUserSocketId(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }
}

module.exports = SocketService;
