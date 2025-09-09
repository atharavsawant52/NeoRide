const rideService = require('../services/ride.service');
const { validationResult } = require('express-validator');
const mapService = require('../services/maps.service');
const { sendMessageToSocketId } = require('../socket');
const rideModel = require('../models/ride.model');

module.exports.createRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { pickup, destination, vehicleType } = req.body;

    try {
        // create ride (rideService should calculate fare and save it)
        const ride = await rideService.createRide({ user: req.user._id, pickup, destination, vehicleType });

        // Re-query to populate user and include otp explicitly
        const rideToReturn = await rideModel.findById(ride._id)
            .populate('user', 'fullname email socketId')
            .select('+otp');

        // respond to client with populated ride including otp (dev/testing)
        res.status(201).json(rideToReturn);

        // perform post-response tasks (notify captains)
        const pickupCoordinates = await mapService.getAddressCoordinate(pickup);
        const captainsInRadius = await mapService.getCaptainsInTheRadius(pickupCoordinates.ltd, pickupCoordinates.lng, 2);

        // ensure some fields exist
        // (we keep otp in ride variable if further internal use required)
        // ride.otp = ride.otp ?? "";

        // notify all nearby captains (each captain gets new-ride event)
        // We send rideWithoutOtp to captains (to avoid exposing user OTP to captains).
        const rideWithoutOtp = await rideModel.findById(ride._id)
            .populate('user', 'fullname email socketId');

        captainsInRadius.forEach(captain => {
            try {
                sendMessageToSocketId(captain.socketId, {
                    event: 'new-ride',
                    data: rideWithoutOtp
                });
            } catch (e) {
                console.error('Error emitting new-ride to captain', captain._id, e);
            }
        });

    } catch (err) {
        console.error('createRide error:', err);
        return res.status(500).json({ message: err.message });
    }
};

module.exports.getFare = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { pickup, destination } = req.query;

    try {
        const fare = await rideService.getFare(pickup, destination);
        return res.status(200).json(fare);
    } catch (err) {
        console.error('getFare error:', err);
        return res.status(500).json({ message: err.message });
    }
};

module.exports.confirmRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        // rideService.confirmRide updates status & captain and returns ride (it already selects +otp)
        const ride = await rideService.confirmRide({ rideId, captain: req.captain });

        // After service updated the ride, fetch populated ride (include captain & user) AND include otp
        const populatedRide = await rideModel.findById(ride._id)
            .populate('captain', 'fullname vehicle socketId email')
            .populate('user', 'fullname email socketId')
            .select('+otp');

        // emit to user (so frontend shows real captain info AND can display OTP if desired)
        if (populatedRide && populatedRide.user && populatedRide.user.socketId) {
            sendMessageToSocketId(populatedRide.user.socketId, {
                event: 'ride-confirmed',
                data: populatedRide
            });
        }

        return res.status(200).json(populatedRide);
    } catch (err) {
        console.error('confirmRide error:', err);
        return res.status(500).json({ message: err.message });
    }
};

module.exports.startRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId, otp } = req.query;

    try {
        const ride = await rideService.startRide({ rideId, otp, captain: req.captain });

        // populate before emitting AND include otp so user side can display it if needed
        const populatedRide = await rideModel.findById(ride._id)
            .populate('captain', 'fullname vehicle socketId email')
            .populate('user', 'fullname email socketId')
            .select('+otp');

        if (populatedRide && populatedRide.user && populatedRide.user.socketId) {
            sendMessageToSocketId(populatedRide.user.socketId, {
                event: 'ride-started',
                data: populatedRide
            });
        }

        return res.status(200).json(populatedRide);
    } catch (err) {
        console.error('startRide error:', err);
        return res.status(500).json({ message: err.message });
    }
};

module.exports.endRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.endRide({ rideId, captain: req.captain });

        const populatedRide = await rideModel.findById(ride._id)
            .populate('captain', 'fullname vehicle socketId email')
            .populate('user', 'fullname email socketId')
            .select('+otp');

        if (populatedRide && populatedRide.user && populatedRide.user.socketId) {
            sendMessageToSocketId(populatedRide.user.socketId, {
                event: 'ride-ended',
                data: populatedRide
            });
        }

        return res.status(200).json(populatedRide);
    } catch (err) {
        console.error('endRide error:', err);
        return res.status(500).json({ message: err.message });
    }
};
