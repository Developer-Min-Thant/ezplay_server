const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * Middleware to verify JWT token and attach user to request
 */
exports.generateToken = (uid, role, ispremiumActive) => {
  return jwt.sign({ uid, role, ispremiumActive }, process.env.JWT_SECRET);
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
    // Attach user to request object
    req.user = { isAdmin: decoded.isAdmin, uid: decoded.uid };
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

    // find user
    const user = await User.findOne({ uid: decoded.uid });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    if(user.deviceId !== req.body.deviceId){
      console.log('Device ID mismatch', user.deviceId, req.body.deviceId);
      return res.status(401).json({
        success: false,
        message: 'Device ID mismatch'
      });
    }

    // check the user is premium or not using the premium expiry date
    if(user.premiumExpirationDate < new Date()){
      user.ispremiumActive = false;
      await user.save();
      if(user.totalDownloads >= 10){
        return res.status(403).json({
          success: false,
          message: 'User has exceeded download limit please connect to support.'
        });
      }
    }

    user.totalDownloads += 1;
    await user.save();
    req.user = { isAdmin: decoded.isAdmin, uid: decoded.uid, ispremiumActive: user.ispremiumActive, 
      totalDownloads: user.totalDownloads };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please log in again.'
    });
  }
};



