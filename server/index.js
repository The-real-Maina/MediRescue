require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

const app = express();

// CORS: set CLIENT_ORIGIN on the live server to your frontend address
// (comma-separated for more than one). When it is not set (local
// development), every origin is allowed, exactly as before.
const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(
  cors(allowedOrigins.length ? { origin: allowedOrigins } : undefined)
);
app.use(express.json());

// ==========================================
// ROUTES
// ==========================================

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/cases', require('./routes/caseRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/tracking', require('./routes/trackingRoutes'));
app.use('/api/health-profile', require('./routes/healthProfileRoutes'));
app.use('/api/ambulances', require('./routes/ambulanceRoutes'));
app.use('/api/assignments', require('./routes/assignmentRoutes'));
app.use('/api/mpesa', require('./routes/mpesaRoutes'));
app.use('/api/team-member', require('./routes/teamMemberRoutes'));
app.use('/api/ai', require('./routes/aiRoutes')); // file on disk must be named aiRoutes.js

// Super Admin Routes
app.use('/api/admin', require('./routes/adminAccountRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Hospital Admin Routes
app.use('/api/hospital-admin', require('./routes/hospitalAdminRoutes'));
app.use('/api/hospital-admin/hr', require('./routes/hospitalAdminHrRoutes'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`MediRescue server running on port ${PORT}`);
});