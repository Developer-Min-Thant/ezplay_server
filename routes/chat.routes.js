const ChatMessage = require("../models/chat.model");
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Todo:: need token
// post chat message
router.post('/', protect, async (req, res) => {
    try {
      const user = req.user;
      const isAdmin = user.isAdmin;
      const { uid, message, type, sender, imagePath, pricingPlan } = req.body;
      const chatMessage = await ChatMessage.create({
        uid,
        message,
        type,
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

// Todo:: need token
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


module.exports = router;
