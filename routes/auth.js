const express = require('express');
const authController = require('../controllers/auth');

const router = express.Router();

router.post('/register', authController.register);

router.post('/login', authController.login);

router.get('/logout', authController.logout);

router.post('/track', authController.track);

router.post('/ug_track', authController.ug_track);

router.post('/untrack', authController.untrack);

router.post('/update', authController.update);

router.post('/updateEmail/:email', authController.updateEmail);

router.post('/updateName/:email', authController.updateName);

router.post('/resetemail', authController.sendResetEmail);

router.post('/populateMyApps', authController.populateMyApps);

router.post('/populateInternships', authController.populateInternships);

router.post('/populateUnderrepresented', authController.populateUnderrepresented);

router.get('/confirm/:confirmationCode', authController.verifyUser);

router.post('/resetpassword/:code', authController.resetPassword);

router.post('/deleteAccount/:id', authController.deleteAccount);

router.post('/suggest', authController.suggest);

router.post('/approve', authController.approve);

router.post('/reject', authController.reject);





module.exports = router;