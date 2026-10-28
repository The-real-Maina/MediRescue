
const express = require('express');
const router = express.Router();

const { authenticate, authorize } = require('../middleware/auth');
const controller = require('../controllers/hospitalAdminController');

// Every route here is for hospital admins only.
router.use(authenticate, authorize('hospital_admin'));

// Hospital details for the logged-in admin
router.get('/hospital', controller.getHospitalDetails);

// Team overview and shifts
router.get('/team', controller.getTeam);
router.get('/shifts', controller.getShifts);
router.put('/shifts', controller.assignShift);
router.delete('/shifts/:staffId/:date', controller.removeShift);

// Staff and driver accounts
router.get('/accounts', controller.getAccounts);
router.post('/accounts', controller.createAccount);
router.post('/accounts/:id/password', controller.resetPassword);
router.post('/accounts/:id/deactivate', controller.deactivateAccount);
router.post('/accounts/:id/reactivate', controller.reactivateAccount);

module.exports = router;
