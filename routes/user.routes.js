const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const { generateToken } = require('../middleware/auth');
const axios = require('axios');
const OtpRequest = require("../models/otpRequest.model");
const { protect } = require('../middleware/auth');
const Counter = require('../models/counter.model');

// to check user is premium or not
router.post('/check-user', protect, async (req, res) => {
  try {
    const { deviceId } = req.body;

    const user = await User.findOne({ uid: req.user.uid });

    console.log(deviceId, user.deviceId);

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
      premiumExpirationDate: user.premiumExpirationDate
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
    const token = generateToken(user.uid, 'user', user.ispremiumActive);

    // Return user data (excluding password) and token
    res.status(200).json({
      success: true,
      name: user.name,
      uid: user.uid,
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
router.post('/phone-login', async (req, res) => {
    try {
      const { phone } = req.body;
      const today = new Date().toISOString().split('T')[0];
      const record = await OtpRequest.findOne({ phone, date: today });

      if (!isValidMyanmarPhone(phone)) {
        return res.status(400).json({ message: 'Invalid phone number' });
      }

      if (record && record.count >= 3) {
        return res.status(429).json({ message: 'You have reached the OTP resend limit for today' });
      }
  
      // Check if user already exists
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this phone number already exists'
        });
      }
  
      /*
      https://v3.smspoh.com/api/otp/request?from=SMSPoh&to=099*******&brand=SMSPoh&accessToken=U01TUG9oVjNBUElLZXk6U01TUG9oVjNBUElTZWNyZXQ= POST
      */

      // send otp
      const response = await axios.post('https://v3.smspoh.com/api/otp/request', null, {
        params: {
          from: 'SMSPoh Demo',
          to: phone,
          brand: 'SMSPoh Demo',
          accessToken: process.env.SMSPOH_ACCESS_TOKEN
        }
      });


      if (record) {
        record.count += 1;
        await record.save();
      } else {
        await OtpRequest.create({ phone, date: today, count: 1 });
      }


      res.status(200).json({
        success: true,
        requestId: response.data.requestId,
        message: 'OTP sent successfully'
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

router.post('/verify-otp', async (req, res) => {
  try {
    const { name, deviceId, password, phone, otp, requestId } = req.body;

    // Verify OTP
    /*
    https://v3.smspoh.com/api/otp/verify?requestId=123456789&code=1234&accessToken=U01TUG9oVjNBUElLZXk6U01TUG9oVjNBUElTZWNyZXQ= POST
    */

    const response = await axios.post('https://v3.smspoh.com/api/otp/verify', null, {
      params: {
        requestId,
        code: otp,
        accessToken: process.env.SMSPOH_ACCESS_TOKEN
      }
    });
    
    if(response.status !== 200) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }


    const user = await User.findOne({ phone });
    if(!user) {
      const uid = await getNextUserId();
      const user = await User.create({
        uid,
        name,
        phone,
        deviceId,
        password,
        ispremiumActive: false,
      });
      const token = generateToken(user.uid, 'user', user.ispremiumActive);
      // Return user data (excluding password) and token
      res.status(201).json({
        success: true,
        name: user.name,
        uid: user.uid,
        token,
        ispremiumActive: user.ispremiumActive, // only for show 
        premiumExpirationDate: user.premiumExpirationDate // only for show 
      });
    } else {
      user.deviceId = deviceId;
      await user.save();
      const token = generateToken(user.uid, 'user', user.ispremiumActive);
      return res.status(200).json({
        success: true,
        uid: user.uid,
        name: user.name,
        token,
        ispremiumActive: user.ispremiumActive, // only for show 
        premiumExpirationDate: user.premiumExpirationDate // only for show 
      });
    }
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification',
      error: error.message
    });
  }
});

// sign up with social
router.post('/social-login', async (req, res) => {
  try {
    const { name, deviceId, provider, token } = req.body;

    // (Later)Todo:: need to check if token is valid here 
    // check with supabase auth secret or use the same secret
    const googleAppleSub = JSON.parse(atob(token.split('.')[1])).sub;

    
    // Check if user exists
    const user = await User.findOne({ phone: googleAppleSub });    

    if (!user) {
      // create one 
      // First create the user without uid
      const uid = await getNextUserId();
      const user = await User.create({
        uid,
        name,
        phone: googleAppleSub,
        deviceId,
        ispremiumActive: false,
        provider,
      });
      const authToken = generateToken(user.uid, 'user', user.ispremiumActive);

      res.status(201).json({
        success: true,
        uid: user.uid,
        name: user.name,
        token: authToken,
        ispremiumActive: user.ispremiumActive, // only for show 
        premiumExpirationDate: user.premiumExpirationDate // only for show 
      });
    } else {
      // Update user's deviceId
      user.deviceId = deviceId;
      await user.save();

      const authToken = generateToken(user.uid, 'user', user.ispremiumActive);

      // Return user data (excluding password) and token
      res.status(200).json({
        success: true,
        uid: user.uid,
        name: user.name,
        token: authToken,
        ispremiumActive: user.ispremiumActive, // only for show 
        premiumExpirationDate: user.premiumExpirationDate // only for show 
      });
    }


  } catch (error) {
    console.error('Social login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during social login',
      error: error.message
    });
  }
});

// delete user by uid
router.delete('/delete-user', protect, async (req, res) => {
  try {
    const { uid } = req.body;
    const user = await User.findOneAndDelete({ uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during user deletion',
      error: error.message
    });
  }
});

function isValidMyanmarPhone(number) {
  const cleaned = number.replace(/\s+/g, '');
  const regex = /^(?:\+?95|0)(1\d{5,7}|9\d{7,9}|8\d{6,8}|2\d{5,7}|3\d{5,7}|4\d{5,7}|5\d{5,7}|6\d{5,7}|7\d{5,7})$/;
  return regex.test(cleaned);
}


async function getNextUserId() {
  const counter = await Counter.findByIdAndUpdate(
    'uid',
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );
  return counter.sequence_value;
}
module.exports = router;