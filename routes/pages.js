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

router.get('/settings', authController.isLoggedIn, (req, res) => {
    if(req.user) {
        res.render('settings', {
            user: req.user,
            message1: req.session.message1,
            message2: req.session.message2
        });
    }
    else {
        res.redirect('/login');
    }
    delete req.session.message1;
    delete req.session.message2;


});

//only go to Internships if logged in
router.get('/internships', authController.isLoggedIn, authController.populateInternships, (req, res) => {
    //console.log(req.internships.length);
    if(req.user) {
        res.render('internships', {
            user: req.user,
            jobs: req.internships,
            message1: req.session.message1,
            message2: req.session.message2
        });
    }
    else {
        res.redirect('/login');
    }
    delete req.session.message1;
    delete req.session.message2;

});

//only go to Underrepresented Programs if logged in
router.get('/underrepresented', authController.isLoggedIn, authController.populateUnderrepresented, (req, res) => {
    //console.log(req.internships.length);
    if(req.user) {
        //console.log(req.internships);
        res.render('underrepresented', {
            user: req.user,
            jobs: req.internships,
            message1: req.session.message1,
            message2: req.session.message2
        });
    }
    else {
        res.redirect('/login');
    }
    delete req.session.message1;
    delete req.session.message2;

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

router.get('/passwordreset/:confirmationCode', (req, res) => {
    if (req.params.confirmationCode != 0){
        res.render('passwordreset', {
            code: req.params.confirmationCode
        });
    }
    else {
        res.render('login', {
            message1: 'Error with resetting password, please contact clarktechapply@gmail.com'
        });
    }
});

//Approvals Page for Privileged Users to approve suggested internship additions
router.get('/approvals', authController.isLoggedIn, authController.populateApprovals, (req, res) => {
if(req.user){
    if(req.user.is_privileged) {
        res.render('approvals', {
            user: req.user,
            suggestions: req.suggestions
        });
    }
    else {
        res.redirect('/');
    }
}
else {
    res.redirect('/');
}
});

module.exports = router;