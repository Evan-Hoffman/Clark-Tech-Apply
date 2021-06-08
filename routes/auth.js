const express = require('express');
const authController = require('../controllers/auth');

const router = express.Router();

router.post('/register', authController.register);

router.post('/login', authController.login);

router.get('/logout', authController.logout);

router.post('/track', authController.track);

router.post('/ug_track', authController.ug_track);

router.post('/ep_track', authController.ep_track);

router.post('/untrack', authController.untrack);

router.post('/update', authController.update);

router.post('/toggleEmailNotifications/:email', authController.toggleEmailNotifications);

router.post('/updateEmail/:email', authController.updateEmail);

router.post('/updateName/:email', authController.updateName);

router.post('/updateYear/:email', authController.updateYear);

router.post('/resetemail', authController.sendResetEmail);

router.post('/populateMyApps', authController.populateMyApps);

router.post('/populateInternships', authController.populateInternships);

router.post('/populateUnderrepresented', authController.populateUnderrepresented);

router.post('/populateExploratory', authController.populateExploratory);

router.get('/confirm/:confirmationCode', authController.verifyUser);

router.post('/resetpassword/:code', authController.resetPassword);

router.post('/deleteAccount/:id', authController.deleteAccount);

router.post('/suggest', authController.suggest);

router.post('/suggestCorrection', authController.isLoggedIn, authController.suggestCorrection);

router.post('/suggestCorrectionUG', authController.isLoggedIn, authController.suggestCorrectionUG);

router.post('/approve', authController.approve);

router.post('/reject', authController.reject);

router.post('/dismissEdit', authController.dismissEdit);

module.exports = router;