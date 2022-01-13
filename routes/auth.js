const express = require('express');
const authController = require('../controllers/auth');

const router = express.Router();
   
router.post('/register', authController.register);

router.post('/login', authController.login);

router.get('/logout', authController.logout);

router.post('/track', authController.track);

router.post('/untrack', authController.untrack);

router.post('/update', authController.update);

router.post('/toggleEmailNotifications/:email', authController.toggleEmailNotifications);

router.post('/updateEmail/:email', authController.updateEmail);

router.post('/updateName/:email', authController.updateName);

router.post('/updateYear/:email', authController.updateYear);

router.post('/resetemail', authController.sendResetEmail);

router.post('/populateMyApps', authController.populateMyApps);

router.post('/populateInternships', authController.populateInternships);

router.post('/populateGradInternships', authController.populateGradInternships);

router.post('/populateGradFulltime', authController.populateGradFulltime);

router.post('/populateUnderrepresented', authController.populateUnderrepresented);

router.post('/populateUnderclassmen', authController.populateUnderclassmen);

router.post('/populateExploratory', authController.populateExploratory);

router.get('/confirm/:confirmationCode', authController.verifyUser);

router.post('/resetpassword/:code', authController.resetPassword);

router.post('/deleteAccount/:id', authController.deleteAccount);

router.post('/suggest', authController.suggest);

router.post('/suggestCorrection', authController.isLoggedIn, authController.suggestCorrection);

router.post('/approve', authController.approve);

router.post('/approveAll', authController.approveAll);

router.post('/edit', authController.edit);

router.post('/deleteListing', authController.deleteListing);

router.post('/reject', authController.reject);

router.post('/dismissEdit', authController.dismissEdit);

router.post('/markEditResolved', authController.markEditResolved);

router.post('/approveDeleteEdit', authController.approveDeleteEdit);


module.exports = router;