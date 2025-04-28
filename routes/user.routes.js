const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const { generateToken } = require('../middleware/auth');
  
// Login route
router.post('/login', async (req, res) => {
  try {
    const { phone, password, deviceId } = req.body;

    // Check if phone number and password are provided
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number and password'
      });
    }

    // Find user by phone number and include password for verification
    const user = await User.findOne({ phone }).select('+password');    

    // Check if user exists and password is correct
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update user's deviceId
    user.deviceId = deviceId;
    await user.save();

    // Generate JWT token with user role
    const token = generateToken(user._id, 'user', user.ispremiumActive);

    // Return user data (excluding password) and token
    res.status(200).json({
      success: true,
      name: user.name,
      uid: user._id,
      token,
      ispremiumActive: user.ispremiumActive,
      premiumExpirationDate: user.premiumExpirationDate
    });
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
});

// sign up with phone number
router.post('/register', async (req, res) => {
    try {
      const { name, phone, password, deviceId } = req.body;
  
      // Check if user already exists
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this phone number already exists'
        });
      }
  
      const user = await User.create({
        name,
        phone,
        deviceId,
        password,
        ispremiumActive: false
      });

      const token = generateToken(user._id, 'user', user.ispremiumActive);

  
      // Return user data (excluding password) and token
      res.status(201).json({
        success: true,
        name: user.name,
        uid: user._id,
        token,
        ispremiumActive: user.ispremiumActive, // only for show 
        premiumExpirationDate: user.premiumExpirationDate // only for show 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during registration',
        error: error.message
      });
    }
});

// sign up with social
router.post('/social-login', async (req, res) => {
 // check with supeabase auth secret or use the same secret
  try {
    const { uid, name, deviceId, provider, token } = req.body;


    //Todo:: need to check if token is valid here 
    // check with supabase auth secret or use the same secret

    // Check if user exists
    const user = await User.findOne({ uid });
    const authToken = generateToken(user._id, 'user', user.ispremiumActive);

    if (!user) {
      // create one 
      const user = await User.create({
        name,
        uid,
        deviceId,
        ispremiumActive: false,
        provider
      });
      res.status(201).json({
        success: true,
        name: user.name,
        uid: user.uid,
        token: authToken,
        ispremiumActive: user.ispremiumActive, // only for show 
        premiumExpirationDate: user.premiumExpirationDate // only for show 
      });
    } else {
      // Update user's deviceId
      user.deviceId = deviceId;
      await user.save();
    }

    // Return user data (excluding password) and token
    res.status(200).json({
      success: true,
      name: user.name,
      uid: user.uid,
      token: authToken,
      ispremiumActive: user.ispremiumActive, // only for show 
      premiumExpirationDate: user.premiumExpirationDate // only for show 
    });
  } catch (error) {
    console.error('Social login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during social login',
      error: error.message
    });
  }
});


// Todo:: need token
router.post('/check-user', async (req, res) => {
  try {
    const { uid, deviceId } = req.body;

    // Check if user exists
    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if(deviceId && user.deviceId !== deviceId) {
      return res.status(401).json({
        success: false,
        message: 'Device ID does not match'
      });
    }

    // Return user data (excluding password)
    res.status(200).json({
      success: true,
      ispremiumActive: user.ispremiumActive,
      premiumExpiryDate: user.premiumExpiryDate
    });
  } catch (error) {
    console.error('User check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during user check',
      error: error.message
    });
  }
});


module.exports = router;