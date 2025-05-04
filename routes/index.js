const express = require('express');
const router = express.Router();

// Import role-based routes
const userRoutes = require('./user.routes');
const downloadRoutes = require('./download.routes');
const chatRoutes = require('./chat.routes');
const adminRoutes = require('./admin.routes');

// Use role-based routes
router.use('/user', userRoutes);
router.use('/download', downloadRoutes);
router.use('/chat', chatRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
