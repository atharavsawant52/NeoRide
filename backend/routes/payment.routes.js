// Backend/routes/payment.routes.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Middleware to handle validation errors cleanly
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// Create Razorpay Order
router.post(
  '/order',
  authMiddleware.authUser,
  [
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    body('currency').optional().isString().isIn(['INR']).withMessage('Invalid currency'),
  ],
  validate,
  paymentController.createOrder
);

// Verify Razorpay Payment
router.post(
  '/verify',
  authMiddleware.authUser,
  [
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    body('razorpay_payment_id').isString().withMessage('razorpay_payment_id required'),
    body('razorpay_order_id').isString().withMessage('razorpay_order_id required'),
    body('razorpay_signature').isString().withMessage('razorpay_signature required'),
  ],
  validate,
  paymentController.verifyPayment
);

// Dummy route kept for development/backward compatibility
router.post(
  '/dummy',
  authMiddleware.authUser,
  [
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    body('amount').optional().isNumeric().withMessage('Amount must be a number if provided'),
    body('method').optional().isString().isIn(['cash', 'online']).withMessage('Payment method must be cash or online'),
  ],
  validate,
  paymentController.dummyPayment
);

module.exports = router;
