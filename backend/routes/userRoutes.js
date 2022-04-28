const express = require('express');
const router = express.Router();
const { PrismaClient, Prisma } = require('@prisma/client');
const jwt = require('jsonwebtoken')
const bcryptjs = require('bcryptjs');

const prisma = new PrismaClient();

const responseFormatter = require('../../lib/responseFormatter')

//For converting variable name to string
// Object.keys({myFirstName]})[0]
let secret = 'secret';

const fetchUserFromToken = async (token, secret) => {
    let data, user;
    try {
        data = jwt.verify(token, secret)
        if (!data) {
            throw new Error('EmptyJwtTokenError')
        }

        user = await prisma.user.findUnique({
            where: {
                id: data.id,
                username: data.username
            }
        });

        if (!user) {
            throw new Error('UserDoesNotExistsError')
        }

        return user;



    } catch (error) {
        console.log(error.toString())
        throw new Error(error.toString())
    }
    
}


const userMiddleware = async (req, res, next) => {
    let token = req.query.token || req.headers.authorization || req.body.token;
    let user;
    if (!token) {
        return res.json({'message':'Token is required'})
    }

    try {
        user = await fetchUserFromToken(token, secret);
        req.user = user;
    } catch (error) {
        console.log(error);
        return res.json(error.toString())
        // next();
    }
    
    next();
    
}


const genHash = async (password) => {
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);
    return hashedPassword;
}


router.get('/', userMiddleware, (req, res) => {
    if (req.user) {
        return res.json({'user':req.user})
    }
    return res.json({'user':{}})
})

router.post('/register', async (req, res) => {
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
        return res.status(400).json(responseFormatter(false, {}, messages, true))
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
        return res.status(400).json(responseFormatter(false, {}, messages, true))
    }



    //Part 2 Querying Database

    try {
        user = await prisma.user.create({
            data: {
                name,
                username,
                password: await genHash(password)
            }
        });
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
            if (e.code === 'P2002') {
                messages.push('This Username has already been taken, Please choose another one!')
                return res.json(responseFormatter(false, {}, messages, true))
            }
        }
        messages.push(error.toString())
        return res.json(responseFormatter(false, {}, messages, true))
    }

    user = { ...user }
    delete user.password;
    delete user.createdAt;


    messages.push('User Registered Successfully!')
    data = {
        user: user,
        token: jwt.sign({
            user: user.username,
            id: user.id
        }, secret, { expiresIn: '1d' })
    }
    return res.json(responseFormatter(true, data, messages, false));
});


router.post('/login', async (req, res) => {
    let user;
    const { username, password } = req.body;
    if (!username) {
        return res.json({
            'error': 'Username is required!'})
    }

    if (!password) {
        return res.json({
            'error': 'Password is required!'})
    }

    try {
        user = await prisma.user.findUnique({
            where: {
                username: username
            }
        });
    } catch (e) {
        return res.json({ 'error': e });
    }



    //check if user exists
    if (!user) {
        return res.json({
            'error': 'Either Username or Password is Wrong! #not exists'})
    }

    if (user.username === username && await bcryptjs.compare(password, user.password)) {
        user = { ...user };
        delete user.password;
        delete user.createdAt;
        
        res.json({
            'message': 'User Logged-in Successfully!',
            'data': {
                'user': user,
                'token': jwt.sign({
                    user: user.username,
                    id:user.id
                }, secret, { expiresIn: '1d' })
            }
        });
    } else {
         return res.json({
            'error': 'Either Username or Password is Wrong! #validation'})
}
       
        

})

router.patch('/updateprofile', userMiddleware, async (req, res) => {
    if (req.user) {
        const { name, username, password } = req.body;
        let data = {};
        if (name) {
            data['name'] = name; 
        }

        if (username) {
            data['username'] = username; 
        }

        if (password) {
            data['password'] = bcryptjs.hashSync(password); 
        }

        try {
            let user = await prisma.user.update({
                where: {
                    id: Number(req.user.id)
                },
                data: data
            });
            return res.json({ 'data': user });
            
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError) {
                if (e.code === 'P2002') {
                    return res.json({
                        'error':
                            'This Username has already been taken, Please choose another one!',
                        'errorActual':e
                    })
                }
            }
            return res.json({ 'error': e });
        }

        
    }
    return res.json({'message':'Not Update Profile'})
})

router.delete('/deleteaccount', userMiddleware, async (req, res) => {
    if (req.user) {
        await prisma.user.delete({
            where: {
                id: Number(req.user.id)
            }
        });
        return res.send('Deleted' + req.user.id)
    }
    return res.send({'message':'User wasn\'t deleted'})
    
})

module.exports = router;