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

// Number(null) is 0, so missing coordinates must be handled first.
const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

// Straight-line (haversine) distance in kilometres.
const distanceKm = (lat1, lng1, lat2, lng2) => {
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const earthRadiusKm = 6371;

  const latDifference = toRadians(lat2 - lat1);
  const lngDifference = toRadians(lng2 - lng1);

  const a =
    Math.sin(latDifference / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(lngDifference / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
// SUGGEST AMBULANCES FOR A CASE
// HOSPITAL STAFF ONLY
//
// Lists the hospital's available ambulances that
// have a driver, closest to the patient first.
// This only suggests. Dispatch still goes through
// PATCH /api/cases/:id/ambulance.
// ==========================================

router.get(
  '/suggestions/:caseId',
  authenticate,
  authorize('hospital_staff'),
  async (req, res) => {
    const caseId = Number(req.params.caseId);
    const hospitalId = req.user.hospital_id;

    if (!validId(caseId)) {
      return res.status(400).json({
        error: 'Invalid case ID'
      });
    }

    if (!validId(hospitalId)) {
      return res.status(403).json({
        error: 'Staff account is not assigned to a hospital'
      });
    }

    try {
      const [cases] = await pool.query(
        `
        SELECT id, status, pickup_lat, pickup_lng
        FROM \`case\`
        WHERE id = ?
          AND hospital_id = ?
        `,
        [caseId, hospitalId]
      );

      if (cases.length === 0) {
        return res.status(404).json({
          error: 'Case not found for this hospital'
        });
      }

      const emergencyCase = cases[0];

      if (emergencyCase.status !== 'requested') {
        return res.status(409).json({
          error: 'This case is not awaiting ambulance dispatch'
        });
      }

      const patientLat = toNumberOrNull(emergencyCase.pickup_lat);
      const patientLng = toNumberOrNull(emergencyCase.pickup_lng);
      const hasPickupLocation =
        patientLat !== null && patientLng !== null;

      // position_age_minutes is calculated in the database because
      // location_updated_at is stored with UTC_TIMESTAMP().
      const [rows] = await pool.query(
        `
        SELECT
          a.id,
          a.plate_number,
          a.driver_id,
          s.name AS driver_name,
          a.current_lat,
          a.current_lng,
          TIMESTAMPDIFF(
            MINUTE,
            a.location_updated_at,
            UTC_TIMESTAMP()
          ) AS position_age_minutes
        FROM ambulance AS a
        INNER JOIN staff AS s
          ON a.driver_id = s.id
        WHERE a.hospital_id = ?
          AND a.status = 'available'
          AND s.hospital_id = a.hospital_id
          AND s.role = 'driver'
        `,
        [hospitalId]
      );

      const ambulances = rows.map((row) => {
        const lat = toNumberOrNull(row.current_lat);
        const lng = toNumberOrNull(row.current_lng);

        const distance =
          hasPickupLocation && lat !== null && lng !== null
            ? Number(
                distanceKm(lat, lng, patientLat, patientLng).toFixed(2)
              )
            : null;

        return {
          id: row.id,
          plate_number: row.plate_number,
          driver_id: row.driver_id,
          driver_name: row.driver_name,
          distance_km: distance,
          position_age_minutes:
            row.position_age_minutes === null
              ? null
              : Number(row.position_age_minutes),
          suggested: false
        };
      });

      // Closest first. Ambulances with no position go last.
      ambulances.sort((first, second) => {
        if (first.distance_km === null && second.distance_km === null) {
          return first.id - second.id;
        }

        if (first.distance_km === null) return 1;
        if (second.distance_km === null) return -1;

        return (
          first.distance_km - second.distance_km ||
          first.id - second.id
        );
      });

      if (ambulances.length > 0 && ambulances[0].distance_km !== null) {
        ambulances[0].suggested = true;
      }

      return res.status(200).json({
        case_id: caseId,
        has_pickup_location: hasPickupLocation,
        ambulances
      });

    } catch (error) {
      console.error('Get ambulance suggestions error:', error);

      return res.status(500).json({
        error: 'Failed to retrieve ambulance suggestions'
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