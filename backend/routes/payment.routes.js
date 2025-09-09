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

router.post(
  '/dummy',
  authMiddleware.authUser, // only logged-in user can make payment
  [
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    body('amount')
      .optional()
      .isNumeric()
      .withMessage('Amount must be a number if provided'),
    body('method')
      .optional()
      .isString()
      .isIn(['cash', 'online'])
      .withMessage('Payment method must be cash or online'),
  ],
  validate,
  paymentController.dummyPayment
);

module.exports = router;
