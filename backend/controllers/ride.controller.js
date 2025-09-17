const rideService = require('../services/ride.service');
const { validationResult } = require('express-validator');
const mapService = require('../services/maps.service');
const { sendMessageToSocketId } = require('../socket');
const rideModel = require('../models/ride.model');
const captainModel = require('../models/captain.model'); // ✅ import captain model

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

        const populatedRide = await rideModel.findById(ride._id)
            .populate('captain', 'fullname vehicle socketId email')
            .populate('user', 'fullname email socketId profilePic')
            .select('+otp');

        if (populatedRide?.user?.socketId) {
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
            .populate('user', 'fullname email socketId profilePic')
            .select('+otp');

        if (populatedRide?.user?.socketId) {
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
