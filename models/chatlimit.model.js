const mongoose = require("mongoose");

const ChatLimitSchema = new mongoose.Schema({
    uid: { type: String, required: true },
    name: { type: String, required: true },
    messageCount: { type: Number, default: 0 },
    hasNewMessage: { type: Boolean, default: false },
});
  
module.exports = mongoose.model("ChatLimit", ChatLimitSchema);
  