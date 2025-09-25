const captainModel = require('../models/captain.model');


module.exports.createCaptain = async ({ firstname, lastname, email, password, color, plate, name, capacity, vehicleType, profilePic, driverLicenseUrl, aadharUrl }) => {
    if (!firstname || !email || !password || !color || !plate || !capacity || !vehicleType) {
        throw new Error('All fields are required');
    }
    const captain = captainModel.create({
        fullname: {
            firstname,
            lastname
        },
        email,
        password,
        vehicle: {
            color,
            plate,
            name,
            capacity,
            vehicleType
        },
        profilePic,
        driverLicenseUrl,
        aadharUrl
    })

    return captain;
}