const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const { generateToken } = require('../middleware/auth');
  
// Login route
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

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

    // Generate JWT token with user role
    const token = generateToken(user._id, 'user', user.ispremiumActive);

    // Return user data (excluding password) and token
    res.status(200).json({
      success: true,
      name: user.name,
      phone: user.phone,
      token,
      ispremiumActive: user.ispremiumActive,
      premiumExpiryDate: user.premiumExpiryDate
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

router.post('/signup', async (req, res) => {
    try {
      const { name, phone, password } = req.body;
  
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
        password,
        ispremiumActive: false
      });
  
      // Return user data (excluding password) and token
      res.status(201).json({
        success: true,
        name: user.name,
        phone: user.phone,
        token: generateToken(user._id, 'user', user.ispremiumActive),
        ispremiumActive: user.ispremiumActive,
        premiumExpiryDate: user.premiumExpiryDate
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


router.get('/test', async (req, res) => {
  res.json({ success: true, message: 'Test successful' });
});

module.exports = router;