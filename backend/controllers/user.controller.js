const userModel = require('../models/user.model');
const userService = require('../services/user.service');
const { validationResult } = require('express-validator');
const blackListTokenModel = require('../models/blackListToken.model');

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
    const token = req.cookies.token || req.headers.authorization.split(' ')[ 1 ];

    await blackListTokenModel.create({ token });

    res.status(200).json({ message: 'Logged out' });

}