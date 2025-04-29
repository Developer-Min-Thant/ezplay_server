// models/ChatMessage.js
const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    index: true,
  },
  sender: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: false,
  },
  isAdmin: {
    type: Boolean,
    required: true,
  },
  imagePath: {
    type: String,
    required: false,
  },
  pricingPlan: {
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
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    index: { expires: 0 },
  },
});


module.exports = mongoose.model('ChatMessage', chatMessageSchema);
