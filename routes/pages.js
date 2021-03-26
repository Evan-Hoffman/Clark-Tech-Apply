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

router.get('/tips', authController.isLoggedIn, (req, res) => {
    if(req.user) {
        res.render('tips', {
            user: req.user
        });
    }
    else {
        res.redirect('/login');
    }
});

//only go to Internships if logged in
router.get('/internships', authController.isLoggedIn, authController.populateInternships, (req, res) => {
    //console.log(req.internships.length);
    if(req.user) {
        console.log(req.internships);
        res.render('internships', {
            user: req.user,
            jobs: req.internships

        });
    }
    else {
        res.redirect('/login');
    }
});

//only go to MyApps if logged in
router.get('/myapps', authController.isLoggedIn, authController.populateMyApps, (req, res) => {
    if(req.user) {
        res.render('myapps', {
            user: req.user,
            myapps: req.myapps
        });
    }
    else {
        res.redirect('/login');
    }
});

module.exports = router;