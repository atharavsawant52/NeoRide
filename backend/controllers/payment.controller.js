// Backend/controllers/payment.controller.js
const rideModel = require('../models/ride.model');
const { sendMessageToSocketId } = require('../socket');

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

    // update ride with payment info and mark paid
    const ride = await rideModel.findByIdAndUpdate(
      rideId,
      {
        paymentID: paymentId,
        paymentMethod: method ?? 'online',
        paymentStatus: 'paid',
        paymentConfirmedAt: new Date(),
        $push: { paymentEvents: { type: 'payment_success', method: method ?? 'online', paymentId, amount, actor: 'user', at: new Date() } }
      },
      { new: true }
    ).populate('user', 'fullname email socketId').populate('captain', 'fullname vehicle socketId email');

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    // emit real-time update
    try {
      const notifyData = {
        rideId: String(ride._id),
        paymentId,
        amount,
        method: method ?? 'online',
        status: 'paid',
        timestamp: new Date().toISOString(),
      };
      if (ride?.captain?.socketId) sendMessageToSocketId(ride.captain.socketId, { event: 'payment-status-changed', data: notifyData });
      if (ride?.user?.socketId) sendMessageToSocketId(ride.user.socketId, { event: 'payment-status-changed', data: notifyData });
    } catch {}

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
