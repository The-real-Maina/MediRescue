const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const { authenticate, authorize } = require('../middleware/auth')

router.get(
  '/available',
  authenticate,
  authorize('hospital_staff'),
  async (req, res) => {
    try {
      const hospitalId = req.user.hospital_id

      const [ambulances] = await pool.query(
        `
        SELECT
          id,
          plate_number,
          driver_id,
          status
        FROM ambulance
        WHERE hospital_id = ?
        AND status = 'available'
        ORDER BY id ASC
        `,
        [hospitalId]
      )

      res.json(ambulances)

    } catch (error) {
      console.error('Get available ambulances error:', error)

      res.status(500).json({
        error: 'Failed to retrieve available ambulances'
      })
    }
  }
)

module.exports = router