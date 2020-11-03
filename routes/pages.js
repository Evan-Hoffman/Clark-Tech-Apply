const express = require('express');
const authController = require('../controllers/auth')

const router = express.Router();

router.get('/', authController.isLoggedIn, (req, res) => {
    res.render('index', {
        user: req.user
    });
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
        res.render('profile', {
            user: req.user
        });
    }
    else {
        res.redirect('/login');
    }
});

//only go to profile if logged in
router.get('/internships', authController.isLoggedIn, authController.populateInternships, (req, res) => {
    //console.log(req.internships.length);
    if(req.user) {
        res.render('internships', {
            user: req.user,
            jobs: req.internships

        });
    }
    else {
        res.redirect('/login');
    }
});

module.exports = router;