const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const captainSchema = new mongoose.Schema({
    fullname: {
        firstname: {
            type: String,
            required: true,
            minlength: [3, 'Firstname must be at least 3 characters long'],
        },
        lastname: {
            type: String,
            minlength: [3, 'Lastname must be at least 3 characters long'],
        }
    },
    profilePic: {
        type: String,
        required: true,
        default: "https://ik.imagekit.io/x5nufbqb6/user-profile-icon-free-vector_SU_b03V_O.jpg?updatedAt=1720705229085"
    },
    // Optional KYC documents
    driverLicenseUrl: {
        type: String,
        default: null
    },
    aadharUrl: {
        type: String,
        default: null
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    phone: {
        type: String,
    },
    socketId: {
        type: String,
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'inactive',
    },
    vehicle: {
        color: { type: String, required: true, minlength: 3 },
        plate: { type: String, required: true, minlength: 3 },
        name: { type: String, required: false, minlength: 2 },
        capacity: { type: Number, required: true, min: 1 },
        vehicleType: { type: String, required: true, enum: ['car', 'motorcycle', 'auto', 'taxi', 'carxl'] }
    },
    location: {
        ltd: { type: Number },
        lng: { type: Number }
    },

    // 👇 NEW FIELD FOR STATS
    stats: {
        earnings: { type: Number, default: 0 },
        ridesCount: { type: Number, default: 0 },
        hoursWorked: { type: Number, default: 0 },
        rating: { type: Number, default: null }
    }

})

// methods
captainSchema.methods.generateAuthToken = function () {
    const token = jwt.sign({ _id: this._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return token;
}

captainSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}

captainSchema.statics.hashPassword = async function (password) {
    return await bcrypt.hash(password, 10);
}

const captainModel = mongoose.model('captain', captainSchema)

module.exports = captainModel
