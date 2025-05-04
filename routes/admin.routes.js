// admin routes
const express = require('express');
const router = express.Router();
const Admin = require('../models/admin.model');
const { generateToken } = require('../middleware/auth');

// admin login
router.post('/login', async (req, res) => {
    try {
        const { name, password } = req.body;
        const admin = await Admin.findOne({ name });
        console.log("Admin login:", admin);
        
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
        const token = generateToken(admin.uid, 'admin');
        res.status(200).json({
            success: true,
            uid: admin.uid,
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

// admin register
// router.get('/register', async (req, res) => {
//     try {
//         const name = "EzplayAdmin";
//         const password = "admin123";
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
