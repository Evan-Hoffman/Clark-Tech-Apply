const express = require('express');
const authController = require('../controllers/auth');

const router = express.Router();

router.post('/register', authController.register);

router.post('/login', authController.login);

router.get('/logout', authController.logout);

router.post('/track', authController.track);

router.post('/untrack', authController.untrack);

router.post('/update', authController.update);

router.post('/populateMyApps', authController.populateMyApps);

router.post('/populateInternships', authController.populateInternships);

module.exports = router;