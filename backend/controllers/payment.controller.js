// Backend/controllers/payment.controller.js
const rideModel = require('../models/ride.model');

module.exports.dummyPayment = async (req, res) => {
  try {
    const { rideId, amount, method } = req.body;

    if (!rideId) {
      return res.status(400).json({ success: false, message: 'rideId is required' });
    }

    // optional: you can validate amount if required
    // if (!amount) return res.status(400).json({ success: false, message: 'amount is required' });

    // create a dummy payment id
    const paymentId = 'DUMMY_' + Date.now();

    // update ride with payment info
    const ride = await rideModel.findByIdAndUpdate(
      rideId,
      {
        paymentID: paymentId,
        paymentMethod: method ?? 'cash'
      },
      { new: true }
    ).populate('user', 'fullname email socketId').populate('captain', 'fullname vehicle socketId email');

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Dummy payment successful',
      paymentId,
      ride
    });
  } catch (err) {
    console.error('Dummy payment error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};
