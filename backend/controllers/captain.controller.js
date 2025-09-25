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
    let driverLicenseUrl = undefined
    let aadharUrl = undefined

    // Handle multiple uploads if provided
    const files = req.files || {};
    if (files.profilePic && files.profilePic[0]) {
        const uploadedImage = await imagekit.upload({
            file: files.profilePic[0].buffer,
            fileName: files.profilePic[0].originalname,
        });
        profilePic = uploadedImage.url
    }
    if (files.driverLicense && files.driverLicense[0]) {
        const uploadedDL = await imagekit.upload({
            file: files.driverLicense[0].buffer,
            fileName: files.driverLicense[0].originalname,
        });
        driverLicenseUrl = uploadedDL.url
    }
    if (files.aadhar && files.aadhar[0]) {
        const uploadedAad = await imagekit.upload({
            file: files.aadhar[0].buffer,
            fileName: files.aadhar[0].originalname,
        });
        aadharUrl = uploadedAad.url
    }

    const hashedPassword = await captainModel.hashPassword(password);

    // Auto capacity map
    const capacityMap = { motorcycle: 1, car: 4, carxl: 6, auto: 3, taxi: 3 };
    const resolvedCapacity = (vehicle && vehicle.capacity) ? Number(vehicle.capacity) : capacityMap[vehicle?.vehicleType] || 1;

    const captain = await captainService.createCaptain({
        firstname: fullname.firstname,
        lastname: fullname.lastname,
        email,
        password: hashedPassword,
        color: vehicle.color,
        plate: vehicle.plate,
        name: vehicle.name,
        capacity: resolvedCapacity,
        vehicleType: vehicle.vehicleType,
        profilePic,
        driverLicenseUrl,
        aadharUrl
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
            if (vehicle.name) update['vehicle.name'] = vehicle.name;
            if (vehicle.capacity != null) {
                update['vehicle.capacity'] = Number(vehicle.capacity);
            } else if (vehicle.vehicleType) {
                const capacityMap = { motorcycle: 1, car: 4, carxl: 6, auto: 3, taxi: 3 };
                update['vehicle.capacity'] = capacityMap[vehicle.vehicleType] || 1;
            }
            if (vehicle.vehicleType) update['vehicle.vehicleType'] = vehicle.vehicleType;
        }

        // handle multiple possible uploads
        const files = req.files || {};
        if (files.profilePic && files.profilePic[0]) {
            const uploadedImage = await imagekit.upload({
                file: files.profilePic[0].buffer,
                fileName: files.profilePic[0].originalname,
            });
            update.profilePic = uploadedImage.url;
        }
        if (files.driverLicense && files.driverLicense[0]) {
            const uploadedDL = await imagekit.upload({
                file: files.driverLicense[0].buffer,
                fileName: files.driverLicense[0].originalname,
            });
            update.driverLicenseUrl = uploadedDL.url;
        }
        if (files.aadhar && files.aadhar[0]) {
            const uploadedAad = await imagekit.upload({
                file: files.aadhar[0].buffer,
                fileName: files.aadhar[0].originalname,
            });
            update.aadharUrl = uploadedAad.url;
        }

        const updated = await captainModel.findByIdAndUpdate(req.captain._id, update, { new: true });
        return res.status(200).json({ captain: updated });
    } catch (err) {
        console.error('updateCaptainProfile error:', err);
        return res.status(500).json({ message: err.message || 'Failed to update profile' });
    }
}