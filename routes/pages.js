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
        console.log(req.user.email + " has just loaded up the Tips page");
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

//only go to Fulltime listings if logged in
router.get('/fulltime', authController.isLoggedIn, authController.populateFulltime, (req, res) => {
    if(req.user) {
        res.render('fulltime', {
            user: req.user,
            id: req.user.id,
            jobs: req.jobs,
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
    //console.log(req.internships);
    if(req.user) {
        res.render('internships', {
            user: req.user,
            id: req.user.id,
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

//only go to Sophomore Programs if logged in
router.get('/underclassmenonly', authController.isLoggedIn, authController.populateUnderclassmen, (req, res) => {
    //console.log(req.internships.length);
    if(req.user) {
        //console.log(req.internships);
        res.render('underclassmenonly', {
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

//only go to Exploratory Programs if logged in
router.get('/exploratory', authController.isLoggedIn, authController.populateExploratory, (req, res) => {
    //console.log(req.internships.length);
    if(req.user) {
        //console.log(req.internships);
        res.render('exploratory', {
            user: req.user,
            jobs: req.programs,
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
            code: req.params.confirmationCode,
            message1: req.session.message1,
            message2: req.session.message2
        });
    }
    else {
        res.render('login', {
            message1: 'Error with resetting password, please contact clarktechapply@yahoo.com'
        });
    }
    delete req.session.message1;
    delete req.session.message2;
});

//Approvals Page for Privileged Users to approve suggested internship additions
router.get('/approvals', authController.isLoggedIn, authController.populateApprovals, (req, res) => {
if(req.user){
    if(req.user.is_privileged) {
        res.render('approvals', {
            user: req.user,
            suggestions: req.suggestions,
            edits: req.edits
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

//only go to Edits if logged in & privileged
router.get('/iedits', authController.isLoggedIn, authController.populateInternships, (req, res) => {

    if(req.user) {
        if(req.user.is_privileged) {
            res.render('iedits', {
                user: req.user,
                jobs: req.internships,
                message1: req.session.message1,
                message2: req.session.message2
            });
        }
        else {
            res.redirect('/');
        }
    }
    else {
        res.redirect('/login');
    }
    delete req.session.message1;
    delete req.session.message2;
});

//only go to Edits if logged in & privileged
router.get('/fedits', authController.isLoggedIn, authController.populateFulltime, (req, res) => {

    if(req.user) {
        if(req.user.is_privileged) {
            res.render('fedits', {
                user: req.user,
                jobs: req.jobs,
                message1: req.session.message1,
                message2: req.session.message2
            });
        }
        else {
            res.redirect('/');
        }
    }
    else {
        res.redirect('/login');
    }
    delete req.session.message1;
    delete req.session.message2;
});

//only go to Edits if logged in & privileged
router.get('/ugedits', authController.isLoggedIn, authController.populateUnderrepresented, (req, res) => {

    if(req.user) {
        if(req.user.is_privileged) {
            res.render('ugedits', {
                user: req.user,
                jobs: req.internships,
                message1: req.session.message1,
                message2: req.session.message2
            });
        }
        else {
            res.redirect('/');
        }
    }
    else {
        res.redirect('/login');
    }
    delete req.session.message1;
    delete req.session.message2;
});

//only go to Edits if logged in & privileged
router.get('/ucedits', authController.isLoggedIn, authController.populateUnderclassmen, (req, res) => {

    if(req.user) {
        if(req.user.is_privileged) {
            res.render('ucedits', {
                user: req.user,
                jobs: req.internships,
                message1: req.session.message1,
                message2: req.session.message2
            });
        }
        else {
            res.redirect('/');
        }
    }
    else {
        res.redirect('/login');
    }
    delete req.session.message1;
    delete req.session.message2;
});


//only go to Edits if logged in & privileged
router.get('/epedits', authController.isLoggedIn, authController.populateExploratory, (req, res) => {

    if(req.user) {
        if(req.user.is_privileged) {
            res.render('epedits', {
                user: req.user,
                jobs: req.programs,
                message1: req.session.message1,
                message2: req.session.message2
            });
        }
        else {
            res.redirect('/');
        }
    }
    else {
        res.redirect('/login');
    }
    delete req.session.message1;
    delete req.session.message2;
});

module.exports = router;