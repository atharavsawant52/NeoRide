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

    // <-- NEW: listen for payment-made emitted by passenger frontend
    socket.on('payment-made', async (payload) => {
      // payload expected: { rideId, paymentId, amount, method }
      try {
        if (!payload || !payload.rideId) {
          return socket.emit('payment-ack', { ok: false, message: 'Invalid payload' });
        }

        const ride = await rideModel.findById(payload.rideId).populate('captain', 'socketId fullname email');
        if (!ride) {
          socket.emit('payment-ack', { ok: false, message: 'Ride not found' });
          return;
        }

        const captainSocketId = ride.captain?.socketId;
        const notifyData = {
          rideId: payload.rideId,
          paymentId: payload.paymentId,
          amount: payload.amount,
          method: payload.method,
          passengerMessage: payload.message || `Passenger paid ${payload.method}`,
          timestamp: new Date().toISOString(),
        };

        // Use helper to emit to captain socket id (your helper is below in file)
        if (captainSocketId) {
          // sendMessageToSocketId defined later in file (it exists already in your code)
          sendMessageToSocketId(captainSocketId, { event: 'ride-paid', data: notifyData });
        } else {
          console.warn('Captain socketId not found for ride:', payload.rideId);
        }

        // Optionally also send ack back to the passenger who sent the event
        socket.emit('payment-ack', { ok: true, paymentId: payload.paymentId });

      } catch (err) {
        console.error('Error handling payment-made socket event:', err);
        socket.emit('payment-ack', { ok: false, message: 'Server error' });
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
