const express = require('express');
const router = express.Router();

const { authenticate, authorize } = require('../middleware/auth');
const hr = require('../controllers/hospitalAdminHrController');

// Only hospital admins can use these routes.
router.use(authenticate, authorize('hospital_admin'));

// Leave
router.get('/leave', hr.getLeaveRequests);
router.post('/leave/:id/review', hr.reviewLeave);

// Absences
router.get('/absences', hr.getAbsences);
router.post('/absences/:id/review', hr.reviewAbsence);

// Attendance: active days and days off
router.get('/attendance', hr.getAttendance);

// Announcements
router.get('/announcements', hr.getAnnouncements);
router.post('/announcements', hr.createAnnouncement);
router.delete('/announcements/:id', hr.deleteAnnouncement);

module.exports = router;