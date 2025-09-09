// Backend/controllers/ride.controller.js
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

    const { userId, pickup, destination, vehicleType } = req.body;

    try {
        // create ride (rideService should calculate fare and save it if implemented)
        const ride = await rideService.createRide({ user: req.user._id, pickup, destination, vehicleType });
        // respond quickly to client
        res.status(201).json(ride);

        // get pickup coordinates and nearby captains
        const pickupCoordinates = await mapService.getAddressCoordinate(pickup);
        const captainsInRadius = await mapService.getCaptainsInTheRadius(pickupCoordinates.ltd, pickupCoordinates.lng, 2);

        // ensure some fields exist
        ride.otp = ride.otp ?? "";

        // populate user so captains get user info with the event
        const rideWithUser = await rideModel.findOne({ _id: ride._id }).populate('user', 'fullname email socketId');

        // notify all nearby captains (each captain gets new-ride event)
        captainsInRadius.forEach(captain => {
            sendMessageToSocketId(captain.socketId, {
                event: 'new-ride',
                data: rideWithUser
            });
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
        // rideService.confirmRide should set captain, status, otp etc and save
        const ride = await rideService.confirmRide({ rideId, captain: req.captain });

        // After service updated the ride, fetch populated ride (include captain & user)
        const populatedRide = await rideModel.findById(ride._id)
            .populate('captain', 'fullname vehicle socketId email')
            .populate('user', 'fullname email socketId');

        // emit to user (so frontend shows real captain info)
        if (populatedRide && populatedRide.user && populatedRide.user.socketId) {
            sendMessageToSocketId(populatedRide.user.socketId, {
                event: 'ride-confirmed',
                data: populatedRide
            });
        }

        // also emit to captain if needed (captain.socketId should be available in req.captain or populatedRide.captain)
        // sendMessageToSocketId(req.captain.socketId, { event: 'ride-accepted', data: populatedRide });

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

        // populate before emitting
        const populatedRide = await rideModel.findById(ride._id)
            .populate('captain', 'fullname vehicle socketId email')
            .populate('user', 'fullname email socketId');

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
            .populate('user', 'fullname email socketId');

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
