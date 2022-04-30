const responseFormatter = require('../../lib/responseFormatter')
const { PrismaClient, Prisma } = require('@prisma/client');
const jwt = require('jsonwebtoken')
const bcryptjs = require('bcryptjs');

const prisma = new PrismaClient();

let secret = process.env.JWT_SECRET;

const genPasswordHash = require('../../lib/genPasswordHash');

const fetchUserFromToken = require('../utils/fetchUserFromToken');
const generateJwtToken =  require('../utils/generateJwtToken');

const userMiddleware =  require('../middleware/userMiddleware');

//extract messages as constant
//http status codes
//extract into functions


//Removes password and createdAt fields from the user object
const configureUserObjectResponse = (user) => {
    let userObj = { ...user }
    delete userObj.password;
    delete userObj.createdAt;
    return userObj;
}


//Checks if the request body is complete or not and return a list of error messages
const checkRequestForRequiredFields = (fields) => {
    let messages = [];
    Object.keys(fields).map((field) => {
        if (!fields[field]) {
            messages.push(`Field: '${Object.values({field})[0]}' is required!`)
        }
    });
    return messages;
}



const validatePasswordField = (password, fields) => {
    let messages = [];
    if (password.length < 8) {
        messages.push("PasswordFieldError: Password is very small. Atleast 8 characters are required!")
    }

    if (Object.keys(fields).length > 0) {
        Object.keys(fields).map((field) => {
            if (password.toLowerCase().search(fields[field].toLowerCase()) !== -1) {
                messages.push(
                    `PasswordFieldError: Password shouldn't include your '${Object.values({ field })[0]}'!`)
            }
        });
    }
    return messages;
}




const home = async (req, res) => {
    let messages = [];
    if (req.user) {
        user = configureUserObjectResponse(req.user);
        messages.push('User Details found Successfully!');
        return res.status(200).json(responseFormatter(true, {user}, messages));
    }
    messages.push('Unable to fetch user details!');
    return res.status(404).json(responseFormatter(false, {}, messages));
}





const register = async (req, res) => {
    let user, data;
    const { name, username, password } = req.body;
    let messages = [];

    messages = checkRequestForRequiredFields({name, username, password})
    //If there is an error (messages.length>0) then send error response
    if (messages.length > 0) {
        return res.status(400).json(responseFormatter(false, {}, messages))
    }

    //Now if data is complete follow password validation
    messages = validatePasswordField(password, {name, username})
    if (messages.length > 0) {
        return res.status(400).json(responseFormatter(false, {}, messages))
    }



    //Part 2 Querying Database
    try {
        user = await prisma.user.create({
            data: {
                name,
                username,
                password: await genPasswordHash(password)
            }
        });
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
            if (e.code === 'P2002') {
                messages.push('This Username has already been taken, Please choose another one!')
                return res.status(404).json(responseFormatter(false, {}, messages))
            }
        }
        messages.push(e.toString())
        return res.status(404).json(responseFormatter(false, {}, messages))
    }

    user = configureUserObjectResponse(user);
    messages.push('User Registered Successfully!')
    return res.status(201).json(responseFormatter(true, {user, token: generateJwtToken(user.username, user.id)}, messages));
}









const login = async (req, res) => {
    let user;
    const { username, password } = req.body;
    let messages = [];


    messages = checkRequestForRequiredFields({ username, password });
    if (messages.length > 0) {
        return res.status(400).json(responseFormatter(false, {}, messages))
    }



    try {
        user = await prisma.user.findUnique({
            where: {
                username: username
            }
        });
    } catch (e) {
        messages.push(e.toString());
        return res.status(404).json(responseFormatter(false, {}, messages));
    }



    //check if user exists
    if (!user) {
        messages.push('Either Username or Password is Wrong! #not exists')
        return res.status(404).json(responseFormatter(false, {}, messages))
    }



    if (user.username === username && await bcryptjs.compare(password, user.password)) {
        user = configureUserObjectResponse(user);
        messages.push('User Logged-in Successfully!');
        return res.status(200).json(responseFormatter(true, {user, token: generateJwtToken(user.username, user.id)}, messages));
    } else {
        messages.push('Either Username or Password is Wrong! #validation');
        return res.status(404).json(responseFormatter(false, {}, messages));
    }
}








const updateprofile = async (req, res) => {
    if (req.user) {
        const { name, username, password } = req.body;
        let data = {}, user, messages = [];
        if (name) {
            data['name'] = name; 
        }

        if (username) {
            data['username'] = username; 
        }

        if (password) {
            fields = {}
            if (name && !username) {
                messages = validatePasswordField(password, { name })
            }
            if (username && !name) {
                messages = validatePasswordField(password, { username })
            }
            if (username && name) {
                messages = validatePasswordField(password, { name, username })
            }
            if (!username && !name) {
                messages = validatePasswordField(password, {})
            }
            if (messages.length > 0) {
                return res.status(400).json(responseFormatter(false, {}, messages))
            }
            data['password'] = bcryptjs.hashSync(password); 
        }

        try {
            user = await prisma.user.update({
                where: {
                    id: Number(req.user.id)
                },
                data: data
            });
            user = configureUserObjectResponse(user);
            messages.push('Profile has been updated successfully!');
            return res.status(201).json(responseFormatter(false, user, messages));
            
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError) {
                if (e.code === 'P2002') {
                    messages.push('This Username has already been taken, Please choose another one!');
                    return res.status(404).json(responseFormatter(false, {}, messages));
                }
            }
            messages.push(e.toString())
            return res.status(404).json(responseFormatter(false, {}, messages))
        }
    }
    messages.push('Unable to update profile!')
    return res.status(404).json(responseFormatter(false, {}, messages))
}










const deleteaccount = async (req, res) => {
    let messages = [], user;
    if (req.user) {
        user = await prisma.user.delete({
            where: {
                id: Number(req.user.id)
            }
        });
        user = configureUserObjectResponse(user);
        messages.push('Account Deleted Successfully!');
        return res.status(201).json(responseFormatter(true, user, messages));
    }
    messages.push('Unable to delete account!')
    return res.status(404).json(responseFormatter(false, {}, messages))
    
}








module.exports = {
    home,
    register,
    login,
    updateprofile,
    deleteaccount,
    userMiddleware,
    fetchUserFromToken
}