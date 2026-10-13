
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const { authenticate, authorize } = require('./middleware/auth');

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());
app.use(express.json());

// ==========================================
// HEALTH CHECK
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ==========================================
// API ROUTES
// ==========================================

// Authentication
app.use('/api/auth', require('./routes/authRoutes'));

// Emergency cases
app.use('/api/cases', require('./routes/caseRoutes'));

// Ambulance management
app.use('/api/ambulances', require('./routes/ambulanceRoutes'));

// Hospital Pricing Management
app.use(
  '/api/hospital-pricing',
  require('./routes/hospitalPricingRoutes')
);

// Super Admin
app.use('/api/admin', require('./routes/adminRoutes'));

// M-Pesa Daraja Sandbox
app.use('/api/mpesa', require('./routes/mpesaRoutes'));

// ==========================================
// DATABASE TEST
// ==========================================

app.get('/api/db-test', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM hospital'
    );

    res.json(rows);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// ==========================================
// STAFF AUTHORIZATION TEST
// ==========================================

app.get(
  '/api/staff-only',
  authenticate,
  authorize('hospital_staff'),
  (req, res) => {
    res.json({
      message: `Hello ${req.user.role}, you're authorized.`
    });
  }
);

// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`MediRescue server running on port ${PORT}`);
});
