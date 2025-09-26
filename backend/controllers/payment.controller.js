// Backend/controllers/payment.controller.js
const rideModel = require('../models/ride.model');
const { sendMessageToSocketId } = require('../socket');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay client (test mode uses test keys)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create an order for a ride
module.exports.createOrder = async (req, res) => {
  try {
    const { rideId, currency } = req.body || {};
    if (!rideId) return res.status(400).json({ success: false, message: 'rideId is required' });

    const ride = await rideModel.findById(rideId).populate('user', 'socketId').populate('captain', 'socketId');
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

    // Amount in paise; ensure integer
    const amountRupees = Number(ride?.fare?.total || 0);
    const amountPaise = Math.max(1, Math.round(amountRupees * 100));
    const cur = currency || 'INR';

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: cur,
      receipt: String(ride._id),
      notes: {
        rideId: String(ride._id),
        userId: String(ride.user),
        captainId: ride.captain ? String(ride.captain) : '',
      },
    });

    // Save order id on ride for reference
    await rideModel.findByIdAndUpdate(ride._id, {
      orderId: order.id,
      paymentMethod: 'online',
      $push: { paymentEvents: { type: 'payment_initiated', method: 'online', paymentId: order.id, amount: amountRupees, actor: 'user', at: new Date() } },
    });

    return res.status(200).json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      order,
      amount: amountPaise,
      currency: cur,
      rideId: String(ride._id),
    });
  } catch (err) {
    console.error('createOrder error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Server error' });
  }
};

// Razorpay Webhook handler (optional): set RAZORPAY_WEBHOOK_SECRET in .env
module.exports.webhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(400).send('Webhook secret not configured');

    const signature = req.headers['x-razorpay-signature'];
    const bodyPayload = req.body; // Buffer from express.raw

    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyPayload)
      .digest('hex');

    if (expected !== signature) {
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(bodyPayload.toString('utf8'));
    // We care mainly about payment.captured / order.paid
    if (!event || !event.event) return res.status(200).send('ignored');

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const payment = event.payload?.payment?.entity || event.payload?.order?.entity;
      const orderId = payment?.order_id || payment?.id; // order id for order.paid, or payment.order_id
      const paymentId = payment?.id;

      if (orderId) {
        const ride = await rideModel.findOne({ orderId }).populate('user', 'socketId').populate('captain', 'socketId');
        if (ride) {
          const updated = await rideModel.findByIdAndUpdate(
            ride._id,
            {
              paymentID: paymentId || ride.paymentID,
              paymentMethod: 'online',
              paymentStatus: 'paid',
              paymentConfirmedAt: new Date(),
              $push: { paymentEvents: { type: 'payment_success', method: 'online', paymentId: paymentId, amount: ride?.fare?.total, actor: 'system', at: new Date() } },
            },
            { new: true }
          ).populate('user', 'fullname email socketId').populate('captain', 'fullname vehicle socketId email');

          try {
            const notifyData = {
              rideId: String(updated._id),
              paymentId: updated.paymentID,
              amount: updated?.fare?.total,
              method: 'online',
              status: 'paid',
              timestamp: new Date().toISOString(),
            };
            if (updated?.captain?.socketId) sendMessageToSocketId(updated.captain.socketId, { event: 'payment-status-changed', data: notifyData });
            if (updated?.user?.socketId) sendMessageToSocketId(updated.user.socketId, { event: 'payment-status-changed', data: notifyData });
          } catch {}
        }
      }
    }

    return res.status(200).send('ok');
  } catch (err) {
    console.error('webhook error:', err);
    return res.status(500).send('error');
  }
};

// Verify payment signature and mark ride as paid
module.exports.verifyPayment = async (req, res) => {
  try {
    const { rideId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body || {};
    if (!rideId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const ride = await rideModel.findById(rideId).populate('user', 'socketId').populate('captain', 'socketId');
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

    // Generate expected signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const updated = await rideModel.findByIdAndUpdate(
      ride._id,
      {
        paymentID: razorpay_payment_id,
        orderId: razorpay_order_id,
        signature: razorpay_signature,
        paymentMethod: 'online',
        paymentStatus: 'paid',
        paymentConfirmedAt: new Date(),
        $push: { paymentEvents: { type: 'payment_success', method: 'online', paymentId: razorpay_payment_id, amount: ride?.fare?.total, actor: 'user', at: new Date() } },
      },
      { new: true }
    ).populate('user', 'fullname email socketId').populate('captain', 'fullname vehicle socketId email');

    // Notify both parties in real-time
    try {
      const notifyData = {
        rideId: String(updated._id),
        paymentId: razorpay_payment_id,
        amount: updated?.fare?.total,
        method: 'online',
        status: 'paid',
        timestamp: new Date().toISOString(),
      };
      if (updated?.captain?.socketId) sendMessageToSocketId(updated.captain.socketId, { event: 'payment-status-changed', data: notifyData });
      if (updated?.user?.socketId) sendMessageToSocketId(updated.user.socketId, { event: 'payment-status-changed', data: notifyData });
      // backward-compatible
      if (updated?.captain?.socketId) sendMessageToSocketId(updated.captain.socketId, { event: 'ride-paid', data: notifyData });
    } catch {}

    return res.status(200).json({ success: true, ride: updated });
  } catch (err) {
    console.error('verifyPayment error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Server error' });
  }
};

// Optional: keep dummy payment for development/backward compatibility
module.exports.dummyPayment = async (req, res) => {
  try {
    const { rideId, amount, method } = req.body;
    if (!rideId) {
      return res.status(400).json({ success: false, message: 'rideId is required' });
    }

    const paymentId = 'DUMMY_' + Date.now();
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

    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

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

    return res.status(200).json({ success: true, message: 'Dummy payment successful', paymentId, ride });
  } catch (err) {
    console.error('Dummy payment error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};
