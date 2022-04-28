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







const home = async (req, res) => {
    let messages = [];
    if (req.user) {
        user = { ...req.user };
        delete user.password;
        delete user.createdAt;
        messages.push('User Details found Successfully!');
        data = {
            user: user
        };
        return res.json(responseFormatter(true, data, messages));
    }
    messages.push('Unable to fetch user details!')
    return res.json(responseFormatter(false, {}, messages))
}

const register = async (req, res) => {
    let user, data;
    const { name, username, password } = req.body;
    let messages = [];


    //Part 1 Sufficient Data Validation

    if (!name) {
        messages.push('Name is required!')
    }

    if (!username) {
        messages.push('Username is required!')
    }

    if (!password) {
        messages.push('Password is required!')
    }


    //If there is an error (messages.length>0) then send error response
    if (messages.length > 0) {
        return res.status(400).json(responseFormatter(false, {}, messages))
    }

    //Now if data has been sent, then follow this course

    if (password.length < 8) {
        messages.push('Password is very small. Atleast 8 characters are required!')
    }

    if (password.toLowerCase().search(name.toLowerCase()) !== -1) {
        messages.push('Password shouldn\'t include your name')
    }

    if (password.toLowerCase().search(username.toLowerCase()) !== -1) {
        messages.push('Password shouldn\'t include your username')
    }

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
                return res.json(responseFormatter(false, {}, messages))
            }
        }
        messages.push(e.toString())
        return res.json(responseFormatter(false, {}, messages))
    }

    user = { ...user }
    delete user.password;
    delete user.createdAt;


    messages.push('User Registered Successfully!')
    data = {
        user: user,
        token: generateJwtToken(user.username, user.id)
    }
    return res.json(responseFormatter(true, data, messages));
}









const login = async (req, res) => {
    let user;
    const { username, password } = req.body;
    let messages = [];


    if (!username) {
        messages.push('Username is required!')
    }

    if (!password) {
        messages.push('Password is required!')
    }


    //If there is an error (messages.length>0) then send error response
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
        return res.json(responseFormatter(false, {}, messages));
    }



    //check if user exists
    if (!user) {
        messages.push('Either Username or Password is Wrong! #not exists')
        return res.json(responseFormatter(false, {}, messages))
    }


    if (user.username === username && await bcryptjs.compare(password, user.password)) {
        user = { ...user }
        delete user.password;
        delete user.createdAt;


        messages.push('User Registered Successfully!');
        data = {
            user: user,
            token: generateJwtToken(user.username, user.id)
        }

        return res.json(responseFormatter(true, data, messages));
    } else {
        messages.push('Either Username or Password is Wrong! #validation');
        return res.json(responseFormatter(false, {}, messages));
    }
         

}








const updateprofile = async (req, res) => {
    if (req.user) {
        const { name, username, password } = req.body;
        let data = {};
        let user;
        let messages = [];
        if (name) {
            data['name'] = name; 
        }

        if (username) {
            data['username'] = username; 
        }

        if (password) {
            if (password.length < 8) {
                messages.push('Password is very small. Atleast 8 characters are required!')
            }
        
            if (name && password.toLowerCase().search(name.toLowerCase()) !== -1) {
                messages.push('Password shouldn\'t include your name')
            }

            if (!name && password.toLowerCase().search(req.user.name.toLowerCase()) !== -1) {
                messages.push('Password shouldn\'t include your name')
            }
        
            if (username && password.toLowerCase().search(username.toLowerCase()) !== -1) {
                messages.push('Password shouldn\'t include your username')
            }

            if (!username && password.toLowerCase().search(req.user.username.toLowerCase()) !== -1) {
                messages.push('Password shouldn\'t include your username')
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
            user = { ...user }
            delete user.password;
            delete user.createdAt;
            messages.push('Profile has been updated successfully!');
            return res.json(responseFormatter(false, user, messages));
            
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError) {
                if (e.code === 'P2002') {
                    messages.push('This Username has already been taken, Please choose another one!');
                    return res.json(responseFormatter(false, {}, messages));
                }
            }
            messages.push(e.toString())
            return res.json(responseFormatter(false, {}, messages))
        }

        
    }
    messages.push('Unable to update profile!')
    return res.json(responseFormatter(false, {}, messages))
}










const deleteaccount = async (req, res) => {
    let messages = [], user;
    if (req.user) {
        user = await prisma.user.delete({
            where: {
                id: Number(req.user.id)
            }
        });

        user = { ...user }
        delete user.password;
        delete user.createdAt;
        messages.push('Account Deleted Successfully!');
        return res.json(responseFormatter(true, user, messages));
    }
    messages.push('Unable to delete account!')
    return res.json(responseFormatter(false, {}, messages))
    
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