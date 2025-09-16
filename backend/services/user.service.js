const userModel = require('../models/user.model');


module.exports.createUser = async ({ firstname, lastname, email, password, profilePic }) => {
    if (!firstname || !email || !password) {
        throw new Error('All fields are required');
    }
    const user = userModel.create({
        fullname: {
            firstname,
            lastname
        },
        email,
        password,
        profilePic
    })

    return user;
}