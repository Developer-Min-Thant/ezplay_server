// models/ChatMessage.js
const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: false,
  },
  senderId: {
    type: Number, // 1 is admin, 2 is user, 3 is system
    required: true,
  },
  imagePath: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
    index: { expires: 0 },
  }
  
});


module.exports = mongoose.model('ChatMessage', chatMessageSchema);
