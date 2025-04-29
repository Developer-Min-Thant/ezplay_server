
// models/ChatMessage.js
const mongoose = require('mongoose');

const otpRequestSchema = new mongoose.Schema({
    phone: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      index: true,
    },
    count: {
      type: Number,
      required: true,
      default: 1,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from creation
      index: { expires: 0 },
    },
  });
  

const OtpRequest = mongoose.model('OtpRequest', otpRequestSchema);

module.exports = OtpRequest;