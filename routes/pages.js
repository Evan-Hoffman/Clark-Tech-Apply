const express = require('express');
const authController = require('../controllers/auth')

const router = express.Router();

router.get('/', (req, res) => {
    res.render('index');
});

router.get('/register', (req, res) => {
    res.render('register');
});

router.get('/login', (req, res) => {
    res.render('login');
});

//only go to profile if logged in
router.get('/profile', authController.isLoggedIn, (req, res) => {
    if(req.user) {
        res.render('profile');
    }
    else {
        res.redirect('/login');
    }
});

module.exports = router;