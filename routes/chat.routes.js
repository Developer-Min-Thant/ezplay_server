const ChatMessage = require("../models/chat.model");
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ChatLimit = require('../models/chatlimit.model');

// post chat message
router.post('/', protect, async (req, res) => {
    try {
      const user = req.user;
      const isAdmin = user.isAdmin;
      const { uid, message, sender, imagePath, pricingPlan } = req.body;

      let chatLimit = await ChatLimit.findOne({ uid });
      if (!chatLimit) {
        chatLimit = await ChatLimit.create({ uid });
      }
    
      if (!isAdmin) {
        if (chatLimit.waitingForAdminReply) {
          if (imagePath == null && chatLimit.messagesSinceLastAdmin < 5) {
            chatLimit.messagesSinceLastAdmin += 1;
          } else if (imagePath != null && chatLimit.photosSinceLastAdmin < 3) {
            chatLimit.photosSinceLastAdmin += 1;
          } else {
            return res.status(429).json({ error: "Please wait for admin to reply before sending more." });
          }
        }
      }
    
      // If admin sends a message, reset limits
      if (isAdmin) {
        chatLimit.messagesSinceLastAdmin = 0;
        chatLimit.photosSinceLastAdmin = 0;
        chatLimit.waitingForAdminReply = false;
      } else {
        chatLimit.waitingForAdminReply = true;
      }
    
      await chatLimit.save();
    
      const chatMessage = await ChatMessage.create({
        uid,
        message,
        sender,
        isAdmin,
        imagePath,
        pricingPlan
      });
      res.status(201).json({
        success: true,
        chatMessage
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error during chat message creation',
        error: error.message
      });
    }
});

// get chat messages
router.get('/', protect, async (req, res) => {
    try {
      const uid = req.query.uid;
      const chatMessages = await ChatMessage.find({
        uid
      }).sort({ createdAt: -1 }).limit(50);

      res.status(200).json({
        success: true,
        chatMessages
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error during chat message retrieval',
        error: error.message
      });
    }
});

// get chat limit
router.get('/limit', protect, async (req, res) => {
    try {
      const uid = req.query.uid;
      const chatLimit = await ChatLimit.findOne({ uid });
      res.status(200).json({
        success: true,
        data: chatLimit
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error during chat limit retrieval',
        error: error.message
      });
    }
});

module.exports = router;
