const mongoose = require('mongoose');

const fareSchema = new mongoose.Schema({
  breakdown: { type: Object, default: {} }, // full fare breakdown per vehicle type
  total: { type: Number, default: 0 }        // numeric fare for selected vehicle
}, { _id: false });

const rideSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  captain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'captain',
    default: null
  },
  pickup: {
    type: String,
    required: true,
  },
  destination: {
    type: String,
    required: true,
  },
  fare: {
    type: fareSchema,
    required: true,
    default: () => ({ breakdown: {}, total: 0 })
  },

  status: {
    type: String,
    enum: ['requested', 'pending', 'accepted', 'ongoing', 'completed', 'cancelled'],
    default: 'requested',
  },

  duration: {
    type: Number,
  }, // in seconds

  distance: {
    type: Number,
  }, // in meters

  // timestamps for real ride timing
  startedAt: {
    type: Date,
    default: null,
  },
  endedAt: {
    type: Date,
    default: null,
  },

  // user rating for the ride (1-5)
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null,
  },

  paymentID: {
    type: String,
  },
  orderId: {
    type: String,
  },
  signature: {
    type: String,
  },

  otp: {
    type: String,
    select: false,
    required: true,
  },

  vehicleType: {
    type: String,
    enum: ['auto', 'car', 'motorcycle'],
    required: true
  },

  paymentMethod: {
    type: String,
    enum: ['cash', 'online'],
    default: 'cash'
  }

}, { timestamps: true });

module.exports = mongoose.model('ride', rideSchema);
