const express = require('express');
const router = express.Router();
const { body } = require("express-validator")
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload');

router.post('/register', upload.single('profilePic'), [
    body('email').isEmail().withMessage('Invalid Email'),
    body('fullname.firstname').isLength({ min: 3 }).withMessage('First name must be at least 3 characters long'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
],
    userController.registerUser
)

router.post('/login', [
    body('email').isEmail().withMessage('Invalid Email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
],
    userController.loginUser
)

router.get('/profile', authMiddleware.authUser, userController.getUserProfile)

router.patch('/profile', authMiddleware.authUser, upload.single('profilePic'), [
    body('fullname.firstname').isLength({ min: 3 }).withMessage('First name must be at least 3 characters long')
],
    userController.updateUserProfile
)

router.get('/logout', authMiddleware.authUser, userController.logoutUser)

// Toggle 2FA for the authenticated user
router.post('/2fa/toggle', authMiddleware.authUser, userController.toggleTwoFactor)


// Verify OTP during login (no auth required)
router.post('/2fa/verify', userController.verifyLoginOtp)

module.exports = router;