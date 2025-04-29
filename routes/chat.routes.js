const ChatMessage = require("../models/chat.model");
const express = require('express');
const router = express.Router();

// Todo:: need token
// post chat message
router.post('/chat', async (req, res) => {
    try {
        // Todo:: isAdmin need to get from token 
      const { uid, message, type, sender, isAdmin, imagePath, pricingPlan } = req.body;
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
router.get('/chat', async (req, res) => {
    try {
      const uid = req.query.uid;
      const chatMessages = await ChatMessage.find({
        uid
      }).sort({ createdAt: -1 }).limit(100);

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
