const rideService = require('../services/ride.service');
const { validationResult } = require('express-validator');
const mapService = require('../services/maps.service');
const { sendMessageToSocketId } = require('../socket');
const rideModel = require('../models/ride.model');
const captainModel = require('../models/captain.model'); // ✅ import captain model
const mongoose = require('mongoose');

// ---------------------- CREATE RIDE ----------------------
module.exports.createRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { pickup, destination, vehicleType } = req.body;

    try {
        // create ride
        const ride = await rideService.createRide({
            user: req.user._id,
            pickup,
            destination,
            vehicleType
        });

        // Re-query to populate user and include otp explicitly
        const rideToReturn = await rideModel.findById(ride._id)
            .populate('user', 'fullname email socketId')
            .select('+otp');

        // respond immediately
        res.status(201).json(rideToReturn);

        // perform post-response tasks (notify captains)
        
        const pickupCoordinates = await mapService.getAddressCoordinate(pickup);
        console.log(`Searching for vehicleType: ${vehicleType}`);
        const allCaptainsInRadius = await mapService.getCaptainsInTheRadius(
            pickupCoordinates.ltd,
            pickupCoordinates.lng,
            2,
            null // Pass null for vehicleType to get all captains in radius
        );
        console.log(`Found ${allCaptainsInRadius.length} captains in radius (before vehicleType filter).`);

        const captainsInRadius = await mapService.getCaptainsInTheRadius(
            pickupCoordinates.ltd,
            pickupCoordinates.lng,
            2,
            vehicleType // Pass the actual vehicleType for filtering
        );
        console.log(`Found ${captainsInRadius.length} captains in radius with vehicleType '${vehicleType}'.`);

        const rideWithoutOtp = await rideModel.findById(ride._id)
            .populate('user', 'fullname email socketId profilePic');

        captainsInRadius.forEach(captain => {
            console.log(`Attempting to send new-ride to captain: ${captain._id} with socketId: ${captain.socketId} and vehicleType: ${captain.vehicle.vehicleType}`);
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

// ---------------------- ACK PAYMENT (CASH) ----------------------
module.exports.ackPayment = async (req, res) => {
    try {
        const { rideId, paymentId } = req.body || {};
        if (!rideId) return res.status(400).json({ message: 'rideId is required' });

        const ride = await rideModel.findById(rideId).populate('user', 'socketId').populate('captain', 'socketId');
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        await rideModel.findByIdAndUpdate(rideId, {
            paymentStatus: 'paid',
            paymentMethod: 'cash',
            paymentConfirmedAt: new Date(),
            ...(paymentId ? { paymentID: paymentId } : {}),
            $push: { paymentEvents: { type: 'cash_acknowledged', method: 'cash', paymentId, actor: 'captain', at: new Date() } }
        });

        const notifyData = {
            rideId: String(ride._id),
            paymentId: paymentId,
            method: 'cash',
            status: 'paid',
            timestamp: new Date().toISOString(),
        };

        if (ride?.captain?.socketId) sendMessageToSocketId(ride.captain.socketId, { event: 'payment-status-changed', data: notifyData });
        if (ride?.user?.socketId) sendMessageToSocketId(ride.user.socketId, { event: 'payment-status-changed', data: notifyData });

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('ackPayment error:', err);
        return res.status(500).json({ message: err.message });
    }
}

// ---------------------- GET RIDE BY ID (CAPTAIN) ----------------------
module.exports.getRideByIdCaptain = async (req, res) => {
    try {
        const rideId = req.params.id;
        if (!rideId) return res.status(400).json({ message: 'Ride id required' });

        const ride = await rideModel.findOne({ _id: rideId, captain: req.captain._id })
            .populate('user', 'fullname email socketId profilePic')
            .populate('captain', 'fullname vehicle socketId email stats');
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        return res.status(200).json(ride);
    } catch (err) {
        console.error('getRideByIdCaptain error:', err);
        return res.status(500).json({ message: err.message || 'Server error' });
    }
}

// ---------------------- USER HISTORY ----------------------
module.exports.getUserHistory = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const status = req.query.status; // e.g., 'completed', 'ongoing', 'all'
        const filter = { user: req.user._id };
        if (status && status !== 'all') {
            filter.status = status;
        }

        const rides = await rideModel
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(limit);

        return res.status(200).json({ rides });
    } catch (err) {
        console.error('getUserHistory error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// ---------------------- CAPTAIN HISTORY ----------------------
module.exports.getCaptainHistory = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const status = req.query.status ?? 'completed';
        const filter = { captain: req.captain._id };
        if (status && status !== 'all') {
            filter.status = status;
        }

        const rides = await rideModel
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(limit);

        return res.status(200).json({ rides });
    } catch (err) {
        console.error('getCaptainHistory error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// ---------------------- RATE RIDE ----------------------
module.exports.rateRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId, rating } = req.body;

    try {
        // ensure ride belongs to this user and is completed
        const ride = await rideModel.findOne({ _id: rideId, user: req.user._id });
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }
        if (ride.status !== 'completed') {
            return res.status(400).json({ message: 'Ride is not completed yet' });
        }
        if (ride.rating != null) {
            return res.status(400).json({ message: 'Rating already submitted' });
        }

        // save rating on ride
        ride.rating = rating;
        await ride.save();

        // recalc captain average rating across all rated rides
        if (ride.captain) {
            const agg = await rideModel.aggregate([
                { $match: { captain: new mongoose.Types.ObjectId(ride.captain), rating: { $ne: null } } },
                { $group: { _id: '$captain', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
            ]);

            const avg = agg?.[0]?.avgRating ?? rating;
            await captainModel.findByIdAndUpdate(ride.captain, {
                $set: { 'stats.rating': Math.round(avg * 10) / 10 }
            });
        }

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('rateRide error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// ---------------------- GET FARE ----------------------
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

// ---------------------- CONFIRM RIDE ----------------------
module.exports.confirmRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.confirmRide({ rideId, captain: req.captain });

        // version for captain HTTP response (no otp)
        const rideForCaptain = await rideModel.findById(ride._id)
            .populate('captain', 'fullname vehicle socketId email')
            .populate('user', 'fullname email socketId profilePic');

        // version for user socket event (with otp)
        const rideForUser = await rideModel.findById(ride._id)
            .populate('captain', 'fullname vehicle socketId email')
            .populate('user', 'fullname email socketId profilePic')
            .select('+otp');

        if (rideForUser?.user?.socketId) {
            sendMessageToSocketId(rideForUser.user.socketId, {
                event: 'ride-confirmed',
                data: rideForUser
            });
        }

        return res.status(200).json(rideForCaptain);
    } catch (err) {
        console.error('confirmRide error:', err);
        return res.status(500).json({ message: err.message });
    }
};

// ---------------------- START RIDE ----------------------
module.exports.startRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId, otp } = req.query;

    try {
        const ride = await rideService.startRide({ rideId, otp, captain: req.captain });

        const populatedRide = await rideModel.findById(ride._id)
            .populate('captain', 'fullname vehicle socketId email')
            .populate('user', 'fullname email socketId profilePic')
            .select('+otp');

        if (populatedRide?.user?.socketId) {
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

// ---------------------- END RIDE ----------------------
module.exports.endRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.endRide({ rideId, captain: req.captain });

        // ✅ Update captain stats
        await captainModel.findByIdAndUpdate(req.captain._id, {
            $inc: {
                "stats.earnings": ride.fare.total || 0,
                "stats.ridesCount": 1,
                "stats.hoursWorked": ride.duration ? ride.duration / 3600 : 0
            }
        });

        const populatedRide = await rideModel.findById(ride._id)
            .populate('captain', 'fullname vehicle socketId email stats')
            .populate('user', 'fullname email socketId profilePic');

        if (populatedRide?.user?.socketId) {
            sendMessageToSocketId(populatedRide.user.socketId, {
                event: 'ride-ended',
                data: populatedRide
            });
        }

        return res.status(200).json(populatedRide);
    } catch (err) {
        console.error('endRide error:', err);
        const msg = err?.message || '';
        if (['Ride not found', 'Ride not ongoing', 'Payment is not completed yet'].includes(msg)) {
            return res.status(400).json({ message: msg });
        }
        return res.status(500).json({ message: msg || 'Server error' });
    }
};
