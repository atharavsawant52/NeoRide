const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const app = express();
const cookieParser = require('cookie-parser');
const connectToDb = require('./db/db');
const userRoutes = require('./routes/user.routes');
const captainRoutes = require('./routes/captain.routes');
const mapsRoutes = require('./routes/maps.routes');
const rideRoutes = require('./routes/ride.routes');
const paymentRoutes = require('./routes/payment.routes');
const paymentController = require('./controllers/payment.controller');


connectToDb();

app.use(cors());

// Razorpay webhook must be parsed as raw buffer for signature verification
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), paymentController.webhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());



app.get('/', (req, res) => {
    res.send('Hello World');
});

app.use('/users', userRoutes);
app.use('/captains', captainRoutes);
app.use('/maps', mapsRoutes);
app.use('/rides', rideRoutes);
app.use('/api/payment', paymentRoutes);

// Warn if JWT secret is missing at startup
if (!process.env.JWT_SECRET) {
    console.warn('[WARN] JWT_SECRET is not set. JWT auth will fail.');
}

// Centralized error handler (e.g., Multer file upload errors)
// Place after routes so it catches route middleware errors
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (!err) return next();
    // Multer-specific errors
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: 'File too large. Max 5MB.' });
        }
        return res.status(400).json({ message: err.message });
    }
    // Custom file filter error from upload middleware
    if (err && err.message === 'Only image or PDF files are allowed!') {
        return res.status(400).json({ message: err.message });
    }
    console.error('Unhandled error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;

