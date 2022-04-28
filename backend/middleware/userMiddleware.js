const responseFormatter = require("../../lib/responseFormatter");
const fetchUserFromToken = require("../utils/fetchUserFromToken");
let secret = process.env.JWT_SECRET;

const userMiddleware = async (req, res, next) => {
    let messages = [];
    let token = req.query.token || req.headers.authorization || req.body.token;
    let user;
    if (!token) {
        messages.push('Access Denied: Token is Required')
        return res.json(responseFormatter(false, {}, messages))
    }
    try {
        user = await fetchUserFromToken(token, secret);
        req.user = user;
    } catch (error) {
        messages.push(error.toString())
        return res.json(responseFormatter(false, {}, messages))
    } 
    next(); 
}

module.exports = userMiddleware;
