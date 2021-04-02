const express = require('express');
const authController = require('../controllers/auth');

const router = express.Router();

router.post('/register', authController.register);

router.post('/login', authController.login);

router.get('/logout', authController.logout);

router.post('/track', authController.track);

router.post('/untrack', authController.untrack);

router.post('/update', authController.update);

router.post('/resetemail', authController.sendResetEmail);

router.post('/populateMyApps', authController.populateMyApps);

router.post('/populateInternships', authController.populateInternships);

router.get('/confirm/:confirmationCode', authController.verifyUser);

router.post('/resetpassword/:code', authController.resetPassword);


module.exports = router;