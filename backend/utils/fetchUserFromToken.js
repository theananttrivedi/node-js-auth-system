const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const fetchUserFromToken = async (token, secret) => {
    let data, user;
    try {
        data = jwt.verify(token, secret)
        if (!data || Object.keys(data).length === 0) {
            throw 'JwtTokenEmptyError'
        }
        user = await prisma.user.findUnique({
            where: {
                id: data.id,
            }
        });
        if (!user) {
            throw 'UserDoesNotExistsError'
        }
        return user;
    } catch (error) {
        if (error.toString() === 'JsonWebTokenError: invalid signature') {
            throw 'Access Denied: Invalid Token'
        }
        throw new Error(error.toString())
    }  
}

module.exports = fetchUserFromToken;