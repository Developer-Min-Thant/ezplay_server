// admin routes
const express = require('express');
const Admin = require('../models/admin.model');
const User = require('../models/user.model');
const Log = require('../models/log.model');
const router = express.Router();
const { generateToken } = require('../middleware/auth');
const { protect } = require('../middleware/auth');

// admin login
router.post('/login', async (req, res) => {
    try {
        const { name, password } = req.body;
        const admin = await Admin.findOne({ name }).select('+password');

        
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        const token = generateToken(admin._id, 'admin', false);
        res.status(200).json({
            success: true,
            uid: admin._id,
            name: admin.name,
            token,
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during admin login',
            error: error.message
        });
    }
});

// update user premium status
router.post('/update-user-premium', protect, async (req, res) => {
    try {
        const { uid, premiumExpirationDate, premiumDuration } = req.body;
        const user = await User.findOne({ uid });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        user.ispremiumActive = true;
        user.premiumExpirationDate = premiumExpirationDate;
        await user.save();

        await Log.create({
            uid,
            name: user.name,
            type: premiumDuration,
        });

        res.status(200).json({
            success: true,
            message: 'User premium status updated successfully'
        });
    } catch (error) {
        console.error('Error updating user premium status:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during user premium status update',
            error: error.message
        });
    }
});

router.get('/user', protect, async (req, res) => {
    try {
        const { uid } = req.query;
        const user = await User.findOne({ uid });
        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during user retrieval',
            error: error.message
        });
    }
});

router.get('/users', protect, async (req, res) => {
    try {
        // pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const skip = (page - 1) * limit;
        const users = await User.find().sort({ uid: 1 }).skip(skip).limit(limit);
        res.status(200).json({
            success: true,
            users,
            page,
            limit,
            total: await User.countDocuments()
        });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during user retrieval',
            error: error.message
        });
    }
});

// 
// admin register
// router.get('/register', async (req, res) => {
//     try {
//         const name = "EzplayAdmin";
//         const password = "@ez!admin123";
//         console.log("Registering admin");
        

//         const admin = await Admin.findOne({ name });
//         if (admin) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Admin with this name already exists'
//             });
//         }
//         const newAdmin = await Admin.create({
//             name,
//             password
//         });
//         const token = generateToken(newAdmin.uid, 'admin');
//         res.status(201).json({
//             success: true,
//             uid: newAdmin.uid,
//             name: newAdmin.name,
//             token,
//         });
//     } catch (error) {
//         console.error('Admin register error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Server error during admin registration',
//             error: error.message
//         });
//     }
// });

module.exports = router;
