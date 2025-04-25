const express = require('express');
const router = express.Router();

// Import role-based routes
const userRoutes = require('./user.routes');
const downloadRoutes = require('./download.routes');

// Use role-based routes
router.use('/user', userRoutes);
router.use('/download', downloadRoutes);

module.exports = router;
