const captainModel = require('../models/captain.model');
const captainService = require('../services/captain.service');
const blackListTokenModel = require('../models/blackListToken.model');
const { validationResult } = require('express-validator');

const imagekit = require('../config/imagekit');

module.exports.registerCaptain = async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, email, password, vehicle } = req.body;

    const isCaptainAlreadyExist = await captainModel.findOne({ email });

    if (isCaptainAlreadyExist) {
        return res.status(400).json({ message: 'Captain already exist' });
    }

    let profilePic = undefined

    if (req.file) {
        const uploadedImage = await imagekit.upload({
            file: req.file.buffer,
            fileName: req.file.originalname,
        });
        profilePic = uploadedImage.url
    }

    const hashedPassword = await captainModel.hashPassword(password);

    const captain = await captainService.createCaptain({
        firstname: fullname.firstname,
        lastname: fullname.lastname,
        email,
        password: hashedPassword,
        color: vehicle.color,
        plate: vehicle.plate,
        capacity: vehicle.capacity,
        vehicleType: vehicle.vehicleType,
        profilePic
    });

    const token = captain.generateAuthToken();

    res.status(201).json({ token, captain });

}

module.exports.loginCaptain = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const captain = await captainModel.findOne({ email }).select('+password');

    if (!captain) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await captain.comparePassword(password);

    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = captain.generateAuthToken();

    res.cookie('token', token);

    res.status(200).json({ token, captain });
}

module.exports.getCaptainProfile = async (req, res, next) => {
    res.status(200).json({ captain: req.captain });
}

module.exports.logoutCaptain = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[ 1 ];

    await blackListTokenModel.create({ token });

    res.clearCookie('token');

    res.status(200).json({ message: 'Logout successfully' });
}

module.exports.updateCaptainProfile = async (req, res, next) => {
    try {
        const { fullname, email, phone, vehicle } = req.body;

        const update = {};
        if (fullname && typeof fullname === 'object') {
            if (fullname.firstname) update['fullname.firstname'] = fullname.firstname;
            if (fullname.lastname) update['fullname.lastname'] = fullname.lastname;
        }
        if (email) update.email = email;
        if (phone) update.phone = phone;

        // vehicle updates (if provided)
        if (vehicle && typeof vehicle === 'object') {
            if (vehicle.color) update['vehicle.color'] = vehicle.color;
            if (vehicle.plate) update['vehicle.plate'] = vehicle.plate;
            if (vehicle.capacity != null) update['vehicle.capacity'] = Number(vehicle.capacity);
            if (vehicle.vehicleType) update['vehicle.vehicleType'] = vehicle.vehicleType;
        }

        if (req.file) {
            const uploadedImage = await imagekit.upload({
                file: req.file.buffer,
                fileName: req.file.originalname,
            });
            update.profilePic = uploadedImage.url;
        }

        const updated = await captainModel.findByIdAndUpdate(req.captain._id, update, { new: true });
        return res.status(200).json({ captain: updated });
    } catch (err) {
        console.error('updateCaptainProfile error:', err);
        return res.status(500).json({ message: err.message || 'Failed to update profile' });
    }
}