const ChatMessage = require("../models/chat.model");
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ChatLimit = require('../models/chatlimit.model');
const upload = require('../utils/upload');
const path = require('path');

// post chat message
router.post('/', protect, async (req, res) => {
    try {
      const user = req.user;
      const isAdmin = user.isAdmin;
      const { uid, isAutoReply, message, sender, imagePath, pricingPlan } = req.body;

      let chatLimit = await ChatLimit.findOne({ uid });
      if (!chatLimit) {
        chatLimit = await ChatLimit.create({ uid });
      }
      console.log("Chat limit:", uid);
      if (!isAdmin) {
        chatLimit.messageCount += 1;
        if(imagePath){
          chatLimit.photoCount += 1;
        }

        if(chatLimit.messageCount > 5 || chatLimit.photoCount > 3){
          return res.status(429).json({ success: false, message: "Please wait for admin to reply before sending more." });
        }
      }


      console.log("Chat limit:", chatLimit);
      
    
      // If admin sends a message, reset limits
      if (isAdmin) {
        chatLimit.messageCount = 0;
        chatLimit.photoCount = 0;
      }
    
      await chatLimit.save();
    
      const chatMessage = await ChatMessage.create({
        uid,
        message,
        sender,
        isAdmin: isAutoReply || isAdmin,
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

router.get('/limits', async (req, res) => {
  try {
    let chatLimit = await ChatLimit.find({ hasNewMessage: true }).sort({ modifiedAt: -1 }).limit(50);
    if(chatLimit.length < 50){
      const chatLimit2 = await ChatLimit.find({ hasNewMessage: false }).sort({ modifiedAt: -1 }).limit(50 - chatLimit.length);
      chatLimit = [...chatLimit, ...chatLimit2];
    }
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

// Upload chat image
router.post('/upload', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Create the image URL path
    const imagePath = `/images/${req.file.filename}`;

    res.status(200).json({
      success: true,
      imagePath
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during image upload',
      error: error.message
    });
  }
});

// Delete chat history
router.delete('/', protect, async (req, res) => {
  try {
    const uid = req.query.uid;
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'User ID (uid) is required'
      });
    }

    // Delete all chat messages for this user
    await ChatMessage.deleteMany({ uid });
    
    // Reset chat limits
    const chatLimit = await ChatLimit.findOne({ uid });
    if (chatLimit) {
      chatLimit.messageCount = 0;
      chatLimit.photoCount = 0;
      await chatLimit.save();
    }

    res.status(200).json({
      success: true,
      message: 'Chat history deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during chat history deletion',
      error: error.message
    });
  }
});

module.exports = router;
