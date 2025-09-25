// Backend/socket.js
const socketIo = require('socket.io');
const userModel = require('./models/user.model');
const captainModel = require('./models/captain.model');
const rideModel = require('./models/ride.model'); // <-- added

let io;

function initializeSocket(server) {
  io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('join', async (data) => {
      try {
        const { userId, userType } = data;

        if (userType === 'user') {
          await userModel.findByIdAndUpdate(userId, { socketId: socket.id });
        } else if (userType === 'captain') {
          await captainModel.findByIdAndUpdate(userId, { socketId: socket.id });
        }
      } catch (err) {
        console.error('Error in join handler:', err);
      }
    });

    socket.on('update-location-captain', async (data) => {
      try {
        const { userId, location } = data;

        if (!location || !location.ltd || !location.lng) {
          return socket.emit('error', { message: 'Invalid location data' });
        }

        await captainModel.findByIdAndUpdate(userId, {
          location: {
            ltd: location.ltd,
            lng: location.lng
          }
        });
      } catch (err) {
        console.error('update-location-captain error:', err);
      }
    });

    // Listen for payment-made emitted by passenger frontend (online payment success)
    socket.on('payment-made', async (payload) => {
      // payload expected: { rideId, paymentId, amount, method }
      try {
        if (!payload || !payload.rideId) {
          return socket.emit('payment-ack', { ok: false, message: 'Invalid payload' });
        }

        const ride = await rideModel.findById(payload.rideId).populate('captain', 'socketId fullname email').populate('user', 'socketId');
        if (!ride) {
          socket.emit('payment-ack', { ok: false, message: 'Ride not found' });
          return;
        }

        // Update DB: mark paid if online
        await rideModel.findByIdAndUpdate(ride._id, {
          paymentID: payload.paymentId,
          paymentMethod: payload.method || 'online',
          paymentStatus: 'paid',
          paymentConfirmedAt: new Date(),
          $push: { paymentEvents: { type: 'payment_success', method: payload.method || 'online', paymentId: payload.paymentId, amount: payload.amount, actor: 'user', at: new Date() } }
        });

        const captainSocketId = ride.captain?.socketId;
        const userSocketId = ride.user?.socketId;
        const notifyData = {
          rideId: String(ride._id),
          paymentId: payload.paymentId,
          amount: payload.amount,
          method: payload.method || 'online',
          status: 'paid',
          timestamp: new Date().toISOString(),
        };

        // Inform captain and user: status changed to paid
        if (captainSocketId) {
          sendMessageToSocketId(captainSocketId, { event: 'payment-status-changed', data: notifyData });
        }
        if (userSocketId) {
          sendMessageToSocketId(userSocketId, { event: 'payment-status-changed', data: notifyData });
        }

        // Also keep backward-compatible event
        if (captainSocketId) {
          sendMessageToSocketId(captainSocketId, { event: 'ride-paid', data: notifyData });
        }

        socket.emit('payment-ack', { ok: true, paymentId: payload.paymentId });

      } catch (err) {
        console.error('Error handling payment-made socket event:', err);
        socket.emit('payment-ack', { ok: false, message: 'Server error' });
      }
    });

    // Captain acknowledges cash received
    socket.on('payment-acknowledged', async (payload) => {
      // payload expected: { rideId, paymentId? }
      try {
        if (!payload || !payload.rideId) return;
        const ride = await rideModel.findById(payload.rideId).populate('captain', 'socketId').populate('user', 'socketId');
        if (!ride) return;

        await rideModel.findByIdAndUpdate(ride._id, {
          paymentStatus: 'paid',
          paymentMethod: 'cash',
          paymentConfirmedAt: new Date(),
          ...(payload.paymentId ? { paymentID: payload.paymentId } : {}),
          $push: { paymentEvents: { type: 'cash_acknowledged', method: 'cash', paymentId: payload.paymentId, actor: 'captain', at: new Date() } }
        });

        const notifyData = {
          rideId: String(ride._id),
          paymentId: payload.paymentId,
          method: 'cash',
          status: 'paid',
          timestamp: new Date().toISOString(),
        };
        if (ride.captain?.socketId) sendMessageToSocketId(ride.captain.socketId, { event: 'payment-status-changed', data: notifyData });
        if (ride.user?.socketId) sendMessageToSocketId(ride.user.socketId, { event: 'payment-status-changed', data: notifyData });
      } catch (err) {
        console.error('payment-acknowledged handler error:', err);
      }
    });

    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.id}`);
      try {
        // Clear socketId from user or captain if present (avoid stale socketId)
        await userModel.updateOne({ socketId: socket.id }, { $unset: { socketId: "" } });
        await captainModel.updateOne({ socketId: socket.id }, { $unset: { socketId: "" } });
      } catch (err) {
        console.error('Error clearing socketId on disconnect:', err);
      }
    });
  });
}

const sendMessageToSocketId = (socketId, messageObject) => {
  console.log('emit ->', messageObject.event, 'to', socketId);
  if (!socketId) {
    console.warn('sendMessageToSocketId called with empty socketId, skipping emit.', messageObject);
    return;
  }

  if (io) {
    io.to(socketId).emit(messageObject.event, messageObject.data);
  } else {
    console.log('Socket.io not initialized.');
  }
}

module.exports = { initializeSocket, sendMessageToSocketId };
