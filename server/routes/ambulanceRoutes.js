
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// ==========================================
// HELPERS
// ==========================================

const validId = (value) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0;
};

// ==========================================
// GET AVAILABLE AMBULANCES
// HOSPITAL STAFF ONLY
// ==========================================

router.get(
  '/available',
  authenticate,
  authorize('hospital_staff'),
  async (req, res) => {
    try {
      const hospitalId = req.user.hospital_id;

      if (!validId(hospitalId)) {
        return res.status(403).json({
          error: 'Staff account is not assigned to a hospital'
        });
      }

      const [ambulances] = await pool.query(
        `
        SELECT
          a.id,
          a.plate_number,
          a.driver_id,
          a.status
        FROM ambulance AS a
        INNER JOIN staff AS s
          ON a.driver_id = s.id
        WHERE a.hospital_id = ?
          AND a.status = 'available'
          AND s.hospital_id = a.hospital_id
          AND s.role = 'driver'
        ORDER BY a.id ASC
        `,
        [hospitalId]
      );

      return res.status(200).json(ambulances);

    } catch (error) {
      console.error('Get available ambulances error:', error);

      return res.status(500).json({
        error: 'Failed to retrieve available ambulances'
      });
    }
  }
);

// ==========================================
// DRIVER: GET MY ASSIGNED AMBULANCE
// ==========================================

router.get(
  '/driver/me',
  authenticate,
  authorize('driver'),
  async (req, res) => {
    try {
      const driverId = req.user.id;
      const hospitalId = req.user.hospital_id;

      if (!validId(driverId) || !validId(hospitalId)) {
        return res.status(403).json({
          error: 'Invalid driver account or hospital assignment'
        });
      }

      const [ambulances] = await pool.query(
        `
        SELECT
          a.id,
          a.plate_number,
          a.status,
          a.current_lat,
          a.current_lng,
          a.location_updated_at
        FROM ambulance AS a
        INNER JOIN staff AS s
          ON s.id = a.driver_id
        WHERE a.driver_id = ?
          AND a.hospital_id = ?
          AND s.hospital_id = a.hospital_id
          AND s.role = 'driver'
        LIMIT 1
        `,
        [driverId, hospitalId]
      );

      if (ambulances.length === 0) {
        return res.status(404).json({
          error: 'No ambulance assigned to this driver'
        });
      }

      return res.status(200).json(ambulances[0]);

    } catch (error) {
      console.error('Get driver ambulance error:', error);

      return res.status(500).json({
        error: 'Failed to retrieve assigned ambulance'
      });
    }
  }
);

// ==========================================
// DRIVER: UPDATE LIVE GPS LOCATION
// ==========================================

router.patch(
  '/driver/location',
  authenticate,
  authorize('driver'),
  async (req, res) => {
    const driverId = req.user.id;
    const hospitalId = req.user.hospital_id;

    if (!validId(driverId) || !validId(hospitalId)) {
      return res.status(403).json({
        error: 'Invalid driver account or hospital assignment'
      });
    }

    const { latitude, longitude } = req.body || {};

    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        error: 'Valid numeric latitude and longitude are required'
      });
    }

    try {
      const [result] = await pool.query(
        `
        UPDATE ambulance AS a
        INNER JOIN staff AS s
          ON s.id = a.driver_id
        SET
          a.current_lat = ?,
          a.current_lng = ?,
          a.location_updated_at = UTC_TIMESTAMP()
        WHERE a.driver_id = ?
          AND a.hospital_id = ?
          AND s.hospital_id = a.hospital_id
          AND s.role = 'driver'
        `,
        [
          latitude,
          longitude,
          driverId,
          hospitalId
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: 'No assigned ambulance found for this driver'
        });
      }

      return res.status(200).json({
        message: 'Ambulance GPS location updated successfully'
      });

    } catch (error) {
      console.error('Update ambulance GPS error:', error);

      return res.status(500).json({
        error: 'Failed to update ambulance GPS location'
      });
    }
  }
);

// ==========================================
// HOSPITAL STAFF: VIEW AMBULANCE LOCATIONS
// ==========================================

router.get(
  '/locations',
  authenticate,
  authorize('hospital_staff'),
  async (req, res) => {
    const hospitalId = req.user.hospital_id;

    if (!validId(hospitalId)) {
      return res.status(403).json({
        error: 'Staff account is not assigned to a hospital'
      });
    }

    try {
      const [ambulances] = await pool.query(
        `
        SELECT
          a.id,
          a.plate_number,
          a.status,
          a.driver_id,
          s.name AS driver_name,
          a.current_lat,
          a.current_lng,
          a.location_updated_at
        FROM ambulance AS a
        LEFT JOIN staff AS s
          ON s.id = a.driver_id
          AND s.hospital_id = a.hospital_id
          AND s.role = 'driver'
        WHERE a.hospital_id = ?
        ORDER BY a.id ASC
        `,
        [hospitalId]
      );

      return res.status(200).json(ambulances);

    } catch (error) {
      console.error('Get ambulance locations error:', error);

      return res.status(500).json({
        error: 'Failed to retrieve ambulance locations'
      });
    }
  }
);

// ==========================================
// GET INDIVIDUAL AMBULANCE STATUS
// HOSPITAL STAFF ONLY
// ==========================================

router.get(
  '/:id/status',
  authenticate,
  authorize('hospital_staff'),
  async (req, res) => {
    const ambulanceId = Number(req.params.id);
    const hospitalId = req.user.hospital_id;

    if (!validId(ambulanceId)) {
      return res.status(400).json({
        error: 'Invalid ambulance ID'
      });
    }

    if (!validId(hospitalId)) {
      return res.status(403).json({
        error: 'Staff account is not assigned to a hospital'
      });
    }

    try {
      const [ambulances] = await pool.query(
        `
        SELECT
          id,
          plate_number,
          status,
          driver_id
        FROM ambulance
        WHERE id = ?
          AND hospital_id = ?
        `,
        [ambulanceId, hospitalId]
      );

      if (ambulances.length === 0) {
        return res.status(404).json({
          error: 'Ambulance not found for this hospital'
        });
      }

      return res.status(200).json(ambulances[0]);

    } catch (error) {
      console.error('Get ambulance status error:', error);

      return res.status(500).json({
        error: 'Failed to retrieve ambulance status'
      });
    }
  }
);

// ==========================================
// CONFIRM AMBULANCE RETURN
// HOSPITAL STAFF ONLY
// ==========================================

router.patch(
  '/:id/return',
  authenticate,
  authorize('hospital_staff'),
  async (req, res) => {
    const ambulanceId = Number(req.params.id);
    const hospitalId = req.user.hospital_id;

    if (!validId(ambulanceId)) {
      return res.status(400).json({
        error: 'Invalid ambulance ID'
      });
    }

    if (!validId(hospitalId)) {
      return res.status(403).json({
        error: 'Staff account is not assigned to a hospital'
      });
    }

    let connection;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Lock the ambulance during the return operation.
      const [ambulances] = await connection.query(
        `
        SELECT
          id,
          hospital_id,
          status
        FROM ambulance
        WHERE id = ?
          AND hospital_id = ?
        FOR UPDATE
        `,
        [ambulanceId, hospitalId]
      );

      if (ambulances.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          error: 'Ambulance not found for this hospital'
        });
      }

      const ambulance = ambulances[0];

      // Only ambulances currently on dispatch can be returned.
      if (
        !['dispatched', 'en_route', 'returning'].includes(
          ambulance.status
        )
      ) {
        await connection.rollback();

        return res.status(409).json({
          error: 'Ambulance is not currently on an active dispatch'
        });
      }

      // Prevent release if the ambulance still has a patient
      // awaiting pickup or being transported.
      //
      // Once a case reaches handed_over, hospital staff have
      // received the patient, so transport is complete.
      //
      // Treatment and payment are hospital workflows and
      // must not prevent the ambulance from returning to service.
      const [activeCases] = await connection.query(
        `
        SELECT
          id,
          status
        FROM \`case\`
        WHERE ambulance_id = ?
          AND status IN (
            'requested',
            'dispatched',
            'picked_up',
            'arrived_at_hospital'
          )
        LIMIT 1
        `,
        [ambulanceId]
      );

      if (activeCases.length > 0) {
        await connection.rollback();

        return res.status(409).json({
          error:
            'Cannot release ambulance while patient transport is active'
        });
      }

      // Patient transport has finished.
      // Make the ambulance available for another dispatch.
      const [result] = await connection.query(
        `
        UPDATE ambulance
        SET status = 'available'
        WHERE id = ?
          AND hospital_id = ?
        `,
        [ambulanceId, hospitalId]
      );

      if (result.affectedRows !== 1) {
        await connection.rollback();

        return res.status(409).json({
          error: 'Unable to update ambulance status'
        });
      }

      await connection.commit();

      return res.status(200).json({
        message: 'Ambulance return confirmed successfully',
        ambulance_id: ambulanceId,
        status: 'available'
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }

      console.error('Confirm ambulance return error:', error);

      return res.status(500).json({
        error: 'Failed to confirm ambulance return'
      });

    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
