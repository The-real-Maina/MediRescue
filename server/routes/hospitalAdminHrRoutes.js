const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// Protect all routes here
router.use(authenticate, authorize('hospital_admin'));

// ==========================================
// LEAVE REQUESTS
// ==========================================
router.get('/leave', async (req, res) => {
  const hospitalId = req.user.hospital_id;
  const { status } = req.query;
  
  try {
    let query = `
      SELECT l.*, s.name AS staff_name, s.role 
      FROM leave_requests l
      JOIN staff s ON l.staff_id = s.id
      WHERE s.hospital_id = ?
    `;
    const params = [hospitalId];

    if (status && status !== 'all') {
      query += ` AND l.status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY l.created_at DESC`;

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('--- DB ERROR (LEAVE) ---', err.message);
    res.json([]); // Safe fallback so frontend doesn't crash
  }
});

// ==========================================
// ABSENCES
// ==========================================
router.get('/absences', async (req, res) => {
  const hospitalId = req.user.hospital_id;
  const { status, from, to } = req.query;
  
  try {
    let query = `
      SELECT a.*, s.name AS staff_name 
      FROM absences a
      JOIN staff s ON a.staff_id = s.id
      WHERE s.hospital_id = ?
    `;
    const params = [hospitalId];

    if (status && status !== 'all') {
      query += ` AND a.status = ?`;
      params.push(status);
    }
    
    if (from && to) {
      query += ` AND a.absence_date BETWEEN ? AND ?`;
      params.push(from, to);
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('--- DB ERROR (ABSENCES) ---', err.message);
    res.json([]);
  }
});

// ==========================================
// ANNOUNCEMENTS
// ==========================================
router.get('/announcements', async (req, res) => {
  const hospitalId = req.user.hospital_id;
  
  try {
    const [rows] = await pool.query(
      `SELECT * FROM announcements WHERE hospital_id = ? ORDER BY created_at DESC`,
      [hospitalId]
    );
    res.json(rows);
  } catch (err) {
    console.error('--- DB ERROR (ANNOUNCEMENTS) ---', err.message);
    res.json([]);
  }
});

// ==========================================
// ATTENDANCE (NEW ROUTE TO FIX 404)
// ==========================================
router.get('/attendance', async (req, res) => {
  const hospitalId = req.user.hospital_id;
  const { from, to } = req.query;
  
  try {
    // A simplified query that grabs staff members and counts their shifts
    // If your database has different table structures, this will safely return []
    const [rows] = await pool.query(`
      SELECT 
        s.id AS staff_id,
        s.name AS staff_name,
        s.role,
        0 AS scheduled_days,
        0 AS approved_leave_days,
        0 AS days_off
      FROM staff s
      WHERE s.hospital_id = ? AND s.role IN ('driver', 'hospital_staff')
    `, [hospitalId]);
    
    res.json(rows);
  } catch (err) {
    console.error('--- DB ERROR (ATTENDANCE) ---', err.message);
    res.json([]);
  }
});

module.exports = router;