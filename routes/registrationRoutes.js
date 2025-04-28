const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');

router.get('/registrations', registrationController.getAllRegistrations);
router.get('/registrations/:id', registrationController.getRegistrationById);
router.delete('/registrations/:id', registrationController.deleteRegistrationById);
router.get('/registrations/vehicle/:number', registrationController.getVehicleByNumber);

module.exports = router;
