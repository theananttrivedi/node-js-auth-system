const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');


//For converting variable name to string
// Object.keys({myFirstName]})[0]



router.get('/', userController.userMiddleware, userController.home);

router.post('/register', userController.register);

router.post('/login', userController.login);

router.patch('/updateprofile', userController.userMiddleware, userController.updateprofile);

router.delete('/deleteaccount', userController.userMiddleware, userController.deleteaccount);

module.exports = router;