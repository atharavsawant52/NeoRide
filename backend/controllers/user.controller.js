const userModel = require('../models/user.model');
const userService = require('../services/user.service');
const { validationResult } = require('express-validator');
const blackListTokenModel = require('../models/blackListToken.model');
const { sendMail } = require('../utils/mailer');
const crypto = require('crypto');

const imagekit = require('../config/imagekit');

module.exports.registerUser = async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, email, password } = req.body;

    const isUserAlready = await userModel.findOne({ email });

    if (isUserAlready) {
        return res.status(400).json({ message: 'User already exist' });
    }

    let profilePic = undefined

    if (req.file) {
        const uploadedImage = await imagekit.upload({
            file: req.file.buffer,
            fileName: req.file.originalname,
        });
        profilePic = uploadedImage.url
    }

    const hashedPassword = await userModel.hashPassword(password);

    const user = await userService.createUser({
        firstname: fullname.firstname,
        lastname: fullname.lastname,
        email,
        password: hashedPassword,
        profilePic
    });

    const token = user.generateAuthToken();

    res.status(201).json({ token, user });


}

module.exports.loginUser = async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await userModel.findOne({ email }).select('+password');

    if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    // If 2FA is enabled, send OTP and return twoFactorRequired
    if (user.twoFactorEnabled) {
        const otp = String(crypto.randomInt(100000, 1000000)); // 6-digit
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await userModel.findByIdAndUpdate(user._id, {
            'twoFactor.otpHash': otpHash,
            'twoFactor.otpExpiresAt': expires
        });

        try {
            await sendMail({
                to: user.email,
                subject: 'Your Login OTP',
                text: `Your OTP is ${otp}. It expires in 10 minutes.`,
                html: `<p>Your OTP is <b>${otp}</b>. It expires in 10 minutes.</p>`
            });
        } catch (e) {
            console.error('sendMail error:', e);
            return res.status(500).json({ message: 'Failed to send OTP. Try again later.' });
        }

        return res.status(200).json({ twoFactorRequired: true, userId: String(user._id) });
    }

    const token = user.generateAuthToken();
    res.cookie('token', token);
    res.status(200).json({ token, user });
}

module.exports.getUserProfile = async (req, res, next) => {

    res.status(200).json(req.user);

}

module.exports.updateUserProfile = async (req, res, next) => {
    try {
        const { fullname, email, phone } = req.body;

        const update = {};
        if (fullname && typeof fullname === 'object') {
            if (fullname.firstname) update['fullname.firstname'] = fullname.firstname;
            if (fullname.lastname) update['fullname.lastname'] = fullname.lastname;
        }
        if (email) update.email = email;
        if (phone) update.phone = phone;

        // handle optional image upload
        if (req.file) {
            const uploadedImage = await imagekit.upload({
                file: req.file.buffer,
                fileName: req.file.originalname,
            });
            update.profilePic = uploadedImage.url;
        }

        const updatedUser = await userModel.findByIdAndUpdate(req.user._id, update, { new: true });
        return res.status(200).json({ user: updatedUser });
    } catch (err) {
        console.error('updateUserProfile error:', err);
        return res.status(500).json({ message: err.message || 'Failed to update profile' });
    }
}

module.exports.logoutUser = async (req, res, next) => {
    res.clearCookie('token');
    const token = req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];
    if (token) {
        await blackListTokenModel.create({ token });
    }

    res.status(200).json({ message: 'Logged out' });

}

// Toggle 2FA for user
module.exports.toggleTwoFactor = async (req, res) => {
    try {
        const enabled = Boolean(req.body.enabled);
        const updated = await userModel.findByIdAndUpdate(req.user._id, {
            twoFactorEnabled: enabled,
            ...(enabled ? {} : { 'twoFactor.otpHash': null, 'twoFactor.otpExpiresAt': null })
        }, { new: true });
        return res.status(200).json({ twoFactorEnabled: updated.twoFactorEnabled });
    } catch (err) {
        console.error('toggleTwoFactor(user) error:', err);
        return res.status(500).json({ message: err.message || 'Failed to toggle 2FA' });
    }
}

// Verify OTP during login for user
module.exports.verifyLoginOtp = async (req, res) => {
    try {
        const { userId, otp } = req.body || {};
        if (!userId || !otp) return res.status(400).json({ message: 'userId and otp are required' });

        const u = await userModel.findById(userId).select('+twoFactor.otpHash +twoFactor.otpExpiresAt +password');
        if (!u) return res.status(404).json({ message: 'User not found' });
        if (!u.twoFactorEnabled) return res.status(400).json({ message: 'Two-factor is not enabled' });

        const now = new Date();
        if (!u.twoFactor?.otpHash || !u.twoFactor?.otpExpiresAt || u.twoFactor.otpExpiresAt < now) {
            return res.status(400).json({ message: 'OTP expired or not set' });
        }

        const providedHash = require('crypto').createHash('sha256').update(String(otp)).digest('hex');
        if (providedHash !== u.twoFactor.otpHash) {
            return res.status(401).json({ message: 'Invalid OTP' });
        }

        await userModel.findByIdAndUpdate(userId, {
            'twoFactor.otpHash': null,
            'twoFactor.otpExpiresAt': null
        });

        const token = u.generateAuthToken();
        res.cookie('token', token);
        return res.status(200).json({ token, user: u });
    } catch (err) {
        console.error('verifyLoginOtp(user) error:', err);
        return res.status(500).json({ message: err.message || 'Server error' });
    }
}