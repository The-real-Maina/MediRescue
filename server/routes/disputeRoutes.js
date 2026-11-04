const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Report an issue (Create a dispute)
router.post('/', async (req, res) => {
  try {
    const { case_id, patient_id, reason } = req.body;
    
    const newDispute = await pool.query(
      'INSERT INTO disputes (case_id, patient_id, reason) VALUES ($1, $2, $3) RETURNING *',
      [case_id, patient_id, reason]
    );
    
    res.status(201).json({ message: 'Dispute submitted successfully', dispute: newDispute.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error while submitting dispute' });
  }
});

module.exports = router;