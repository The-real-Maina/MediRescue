const express = require('express');
const router = express.Router();

const dbModule = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { calculateEta } = require('../services/etaService');

const base = dbModule.pool || dbModule;
const db = typeof base.promise === 'function' ? base.promise() : base;

// Patient: live ambulance position + ETA for a case
// GET /api/tracking/case/:caseId
router.get('/case/:caseId', authenticate, async (req, res) => {
  try {
    const caseId = Number(req.params.caseId);

    if (!Number.isInteger(caseId) || caseId <= 0) {
      return res.status(400).json({ error: 'Invalid case id' });
    }

    const [rows] = await db.query(
      `SELECT c.id, c.patient_id, c.status,
              c.pickup_lat, c.pickup_lng,
              a.plate_number, a.current_lat, a.current_lng,
              a.location_updated_at,
              TIMESTAMPDIFF(SECOND, a.location_updated_at, NOW())
                AS age_seconds
       FROM \`case\` c
       LEFT JOIN ambulance a ON a.id = c.ambulance_id
       WHERE c.id = ?`,
      [caseId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const row = rows[0];

    // Only the patient who owns the case may track it
    if (
      req.user.role !== 'patient' ||
      Number(req.user.id) !== Number(row.patient_id)
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Tracking is only live while the ambulance is on its way
    if (row.status !== 'dispatched') {
      return res.json({ tracking: false, status: row.status });
    }

    const hasPickup = row.pickup_lat != null && row.pickup_lng != null;
    const hasAmbulance = row.current_lat != null && row.current_lng != null;

    const pickup = hasPickup
      ? { lat: Number(row.pickup_lat), lng: Number(row.pickup_lng) }
      : null;

    const ambulance = hasAmbulance
      ? {
          plate_number: row.plate_number,
          lat: Number(row.current_lat),
          lng: Number(row.current_lng),
          updated_at: row.location_updated_at,
          age_seconds:
            row.age_seconds == null ? null : Number(row.age_seconds)
        }
      : null;

    // Missing position: keep the screen alive with a clear reason
    if (!ambulance || !pickup) {
      return res.json({
        tracking: true,
        status: row.status,
        plate_number: row.plate_number,
        ambulance,
        pickup,
        eta: null,
        reason: !ambulance
          ? 'waiting_for_driver_gps'
          : 'pickup_location_missing'
      });
    }

    const result = await calculateEta(
      caseId,
      ambulance.lat,
      ambulance.lng,
      pickup.lat,
      pickup.lng
    );

    const minutes = Math.max(1, Math.ceil(result.etaMinutes));

    res.json({
      tracking: true,
      status: row.status,
      plate_number: row.plate_number,
      ambulance,
      pickup,
      eta: {
        minutes,
        arrival_time: new Date(Date.now() + minutes * 60000).toISOString(),
        distance_km: Number(result.distanceKm.toFixed(2)),
        source: result.source
      },
      route: result.path
    });
  } catch (err) {
    console.error('Tracking error:', err);
    res.status(500).json({ error: 'Failed to load tracking details' });
  }
});

module.exports = router;