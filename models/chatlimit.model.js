const mongoose = require("mongoose");

const ChatLimitSchema = new mongoose.Schema({
    uid: { type: String, required: true },
    messagesSinceLastAdmin: { type: Number, default: 0 },
    photosSinceLastAdmin: { type: Number, default: 0 },
    waitingForAdminReply: { type: Boolean, default: true }
  });
  
  module.exports = mongoose.model("ChatLimit", ChatLimitSchema);
  