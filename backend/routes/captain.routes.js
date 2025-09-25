const captainController = require('../controllers/captain.controller');
const express = require('express');
const router = express.Router();
const { body } = require("express-validator")
const authMiddleware = require('../middlewares/auth.middleware');
const { getCaptainStats } = require('../controllers/captainStats.controller');


const upload = require('../middlewares/upload');

router.post('/register', upload.fields([
    { name: 'profilePic', maxCount: 1 },
    { name: 'driverLicense', maxCount: 1 },
    { name: 'aadhar', maxCount: 1 }
]), [
    body('email').isEmail().withMessage('Invalid Email'),
    body('fullname.firstname').isLength({ min: 3 }).withMessage('First name must be at least 3 characters long'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('vehicle.color').isLength({ min: 3 }).withMessage('Color must be at least 3 characters long'),
    body('vehicle.plate').isLength({ min: 3 }).withMessage('Plate must be at least 3 characters long'),
    body('vehicle.capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
    body('vehicle.vehicleType').isIn([ 'car', 'motorcycle', 'auto', 'taxi', 'carxl' ]).withMessage('Invalid vehicle type'),
    body('vehicle.name').optional().isLength({ min: 2 }).withMessage('Vehicle name must be at least 2 characters long')
],
    captainController.registerCaptain
)


router.post('/login', [
    body('email').isEmail().withMessage('Invalid Email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
],
    captainController.loginCaptain
)


router.get('/profile', authMiddleware.authCaptain, captainController.getCaptainProfile)

router.get('/logout', authMiddleware.authCaptain, captainController.logoutCaptain)
router.get("/stats", authMiddleware.authCaptain, getCaptainStats)

// update captain profile
router.patch('/profile', authMiddleware.authCaptain, upload.fields([
    { name: 'profilePic', maxCount: 1 },
    { name: 'driverLicense', maxCount: 1 },
    { name: 'aadhar', maxCount: 1 }
]), [
    body('fullname.firstname').optional().isLength({ min: 3 }).withMessage('First name must be at least 3 characters long'),
    body('email').optional().isEmail().withMessage('Invalid Email'),
    body('phone').optional().isString().isLength({ min: 7 }).withMessage('Invalid phone number'),
    body('vehicle.color').optional().isLength({ min: 3 }).withMessage('Color must be at least 3 characters long'),
    body('vehicle.plate').optional().isLength({ min: 3 }).withMessage('Plate must be at least 3 characters long'),
    body('vehicle.name').optional().isLength({ min: 2 }).withMessage('Vehicle name must be at least 2 characters long'),
    body('vehicle.capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
    body('vehicle.vehicleType').optional().isIn(['car', 'motorcycle', 'auto', 'taxi', 'carxl']).withMessage('Invalid vehicle type')
],
    captainController.updateCaptainProfile
)


module.exports = router;