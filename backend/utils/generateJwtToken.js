const jwt = require('jsonwebtoken');
let secret = process.env.JWT_SECRET;
const expiry_jwt = '1d'

const generateJwtToken =  (username, id, expiry = expiry_jwt) => jwt.sign({
    user: username,
    id: id
}, secret, { expiresIn: expiry })

module.exports = generateJwtToken;