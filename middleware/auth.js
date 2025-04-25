const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * Middleware to verify JWT token and attach user to request
 */
exports.generateToken = (id, role, ispremiumActive) => {
  return jwt.sign({ id, role, ispremiumActive }, process.env.JWT_SECRET);
};

exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'You are not logged in. Please log in to get access.'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by ID
    const user = await User.findById(decoded.id);
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please log in again.'
    });
  }
};

/**
 * Middleware to check if user is premium or has not exceeded download limit
 */
exports.checkDownloadEligibility = async (req, res, next) => {
  try {
    // If user is premium, allow download
    if (req.user.ispremiumActive) {
      return next();
    }
    
    // If user has downloaded less than 10 videos, allow download
    if (req.user.totalDownloads < 10) {
      return next();
    }
    
    // Otherwise, return error
    return res.status(403).json({
      success: false,
      message: 'You have reached the maximum number of free downloads. Please upgrade to premium to continue downloading.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while checking download eligibility.'
    });
  }
};
