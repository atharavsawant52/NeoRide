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
    enum: ['auto', 'car', 'motorcycle', 'taxi', 'carxl'],
    required: true
  },

  paymentMethod: {
    type: String,
    enum: ['cash', 'online'],
    default: 'cash'
  },

  // Payment gate
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  paymentConfirmedAt: {
    type: Date,
    default: null
  },
  // Event log for payments and lifecycle
  paymentEvents: {
    type: [
      new mongoose.Schema({
        type: { type: String, enum: ['payment_initiated', 'payment_success', 'cash_marked_received', 'cash_acknowledged', 'ride_completed', 'ride_cancelled'], required: true },
        method: { type: String, enum: ['cash', 'online'], default: undefined },
        paymentId: { type: String },
        amount: { type: Number },
        actor: { type: String, enum: ['user', 'captain', 'system'] },
        at: { type: Date, default: Date.now }
      }, { _id: false })
    ],
    default: []
  }

}, { timestamps: true });

module.exports = mongoose.model('ride', rideSchema);
