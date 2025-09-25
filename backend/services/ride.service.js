const rideModel = require('../models/ride.model');
const mapService = require('./maps.service');
const crypto = require('crypto');

async function getFare(pickup, destination) {
    if (!pickup || !destination) {
        throw new Error('Pickup and destination are required');
    }

    const distanceTime = await mapService.getDistanceTime(pickup, destination);

    const baseFare = {
        auto: 30,
        car: 50,
        motorcycle: 20,
        taxi: 45,
        carxl: 70
    };

    const perKmRate = {
        auto: 26,
        car: 26,
        motorcycle: 10,
        taxi: 24,
        carxl: 32
    };

    const perMinuteRate = {
        auto: 5,
        car: 5,
        motorcycle: 1.5,
        taxi: 4.5,
        carxl: 6
    };

    const dKm = distanceTime.distance.value / 1000;
    const dMin = distanceTime.duration.value / 60;
    const fare = {
        auto: Math.round(baseFare.auto + (dKm * perKmRate.auto) + (dMin * perMinuteRate.auto)),
        car: Math.round(baseFare.car + (dKm * perKmRate.car) + (dMin * perMinuteRate.car)),
        motorcycle: Math.round(baseFare.motorcycle + (dKm * perKmRate.motorcycle) + (dMin * perMinuteRate.motorcycle)),
        taxi: Math.round(baseFare.taxi + (dKm * perKmRate.taxi) + (dMin * perMinuteRate.taxi)),
        carxl: Math.round(baseFare.carxl + (dKm * perKmRate.carxl) + (dMin * perMinuteRate.carxl)),
    };

    return fare;
}

module.exports.getFare = getFare;

function getOtp(num) {
    function generateOtp(num) {
        const otp = crypto.randomInt(Math.pow(10, num - 1), Math.pow(10, num)).toString();
        return otp;
    }
    return generateOtp(num);
}

module.exports.createRide = async ({ user, pickup, destination, vehicleType }) => {
    if (!user || !pickup || !destination || !vehicleType) {
        throw new Error('All fields are required');
    }

    // calculate fare object
    const fareObj = await getFare(pickup, destination);

    // pick the numeric fare for selected vehicle type
    const fareValue = fareObj[vehicleType];

    // create and save ride (await is important)
    const ride = await rideModel.create({
        user,
        pickup,
        destination,
        otp: getOtp(6),
        fare: {
            breakdown: fareObj,   // keep full breakdown if needed
            total: fareValue
        },
        paymentMethod: 'cash', // default; update later if online payment added
        status: 'requested',
        vehicleType
    });

    // return saved ride (caller can populate as needed)
    return ride;
}

module.exports.confirmRide = async ({ rideId, captain }) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }

    // set captain and accepted status and return the updated ride
    await rideModel.findOneAndUpdate(
        { _id: rideId },
        {
            status: 'accepted',
            captain: captain._id
        },
        { new: true }
    );

    // return populated ride (including otp)
    const ride = await rideModel.findOne({ _id: rideId })
        .populate('user')
        .populate('captain')
        .select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    return ride;
}

module.exports.startRide = async ({ rideId, otp, captain }) => {
    if (!rideId || !otp) {
        throw new Error('Ride id and OTP are required');
    }

    const ride = await rideModel.findOne({
        _id: rideId
    }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    if (ride.status !== 'accepted') {
        throw new Error('Ride not accepted');
    }

    if (String(ride.otp) !== String(otp)) {
        throw new Error('Invalid OTP');
    }

    // set to ongoing, record startedAt, and return populated ride after update
    await rideModel.findOneAndUpdate(
        { _id: rideId },
        { status: 'ongoing', startedAt: new Date() }
    );

    const updated = await rideModel.findById(rideId)
        .populate('user')
        .populate('captain');
    return updated;
}

module.exports.endRide = async ({ rideId, captain }) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }

    const ride = await rideModel.findOne({
        _id: rideId,
        captain: captain._id
    }).populate('user').populate('captain');

    if (!ride) {
        throw new Error('Ride not found');
    }

    if (ride.status !== 'ongoing') {
        throw new Error('Ride not ongoing');
    }

    // Payment must be completed before allowing ride completion
    if (ride.paymentStatus !== 'paid') {
        throw new Error('Payment is not completed yet');
    }

    // compute duration using startedAt and set endedAt; also compute distance
    const endTime = new Date();
    let durationSec = null;
    if (ride.startedAt) {
        durationSec = Math.max(1, Math.floor((endTime.getTime() - new Date(ride.startedAt).getTime()) / 1000));
    }

    // distance from maps (meters); fallback to existing distance
    let distanceMeters = ride.distance;
    try {
        const dt = await mapService.getDistanceTime(ride.pickup, ride.destination);
        if (dt && dt.distance && typeof dt.distance.value === 'number') {
            distanceMeters = dt.distance.value;
        }
    } catch (e) {
        // ignore map errors; keep previous distance if any
    }

    await rideModel.findOneAndUpdate(
        { _id: rideId },
        {
            status: 'completed',
            endedAt: endTime,
            ...(durationSec ? { duration: durationSec } : {}),
            ...(distanceMeters != null ? { distance: distanceMeters } : {}),
            $push: { paymentEvents: { type: 'ride_completed', actor: 'captain', at: new Date() } }
        }
    );

    const updated = await rideModel.findById(rideId)
        .populate('user')
        .populate('captain')
        .select('+otp');
    return updated;
}
