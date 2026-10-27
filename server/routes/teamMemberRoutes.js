const express = require('express');
const router = express.Router();

const { authenticate, authorize } = require('../middleware/auth');
const member = require('../controllers/teamMemberController');

// Hospital staff and drivers only.
router.use(authenticate, authorize('hospital_staff', 'driver'));

// My shifts
router.get('/shifts', member.getMyShifts);

// Leave
router.get('/leave', member.getMyLeave);
router.post('/leave', member.requestLeave);
router.post('/leave/:id/cancel', member.cancelLeave);

// Absences
router.get('/absences', member.getMyAbsences);
router.post('/absences', member.reportAbsence);

// Announcements
router.get('/announcements', member.getMyAnnouncements);

module.exports = router;