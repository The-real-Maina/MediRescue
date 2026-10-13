
const pool = require('../config/db');

// ==========================================
// GET HOSPITAL SERVICE PRICES
// Hospital staff can view only their hospital
// ==========================================

exports.getPrices = async (req, res) => {
  const hospitalId = req.user.hospital_id;

  if (!hospitalId) {
    return res.status(403).json({
      error: 'Your account is not assigned to a hospital'
    });
  }

  try {
    const [prices] = await pool.query(
      `
        SELECT
          id,
          hospital_id,
          service_name,
          severity,
          amount,
          created_at
        FROM hospital_service_prices
        WHERE hospital_id = ?
        ORDER BY FIELD(
          severity,
          'low',
          'moderate',
          'high',
          'critical'
        )
      `,
      [hospitalId]
    );

    return res.status(200).json(prices);
  } catch (err) {
    console.error('Get hospital prices error:', err);

    return res.status(500).json({
      error: 'Failed to retrieve hospital prices'
    });
  }
};

// ==========================================
// UPDATE HOSPITAL SERVICE PRICE
// Hospital staff can edit only their hospital
// ==========================================

exports.updatePrice = async (req, res) => {
  const hospitalId = req.user.hospital_id;
  const priceId = Number(req.params.id);
  const { amount } = req.body;

  if (!hospitalId) {
    return res.status(403).json({
      error: 'Your account is not assigned to a hospital'
    });
  }

  if (!Number.isSafeInteger(priceId) || priceId <= 0) {
    return res.status(400).json({
      error: 'Invalid price ID'
    });
  }

  if (
    amount === undefined ||
    amount === null ||
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    Math.round(amount * 100) !== amount * 100
  ) {
    return res.status(400).json({
      error: 'Enter a valid positive amount with at most two decimal places'
    });
  }

  try {
    const [result] = await pool.query(
      `
        UPDATE hospital_service_prices
        SET amount = ?
        WHERE id = ?
          AND hospital_id = ?
      `,
      [amount, priceId, hospitalId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Price not found for your hospital'
      });
    }

    return res.status(200).json({
      message: 'Hospital service price updated successfully',
      price_id: priceId,
      amount
    });
  } catch (err) {
    console.error('Update hospital price error:', err);

    return res.status(500).json({
      error: 'Failed to update hospital service price'
    });
  }
};
