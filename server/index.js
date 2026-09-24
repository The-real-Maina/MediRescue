require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const { authenticate, authorize } = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/cases', require('./routes/caseRoutes'));

app.get('/api/db-test', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM hospital');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/staff-only', authenticate, authorize('hospital_staff'), (req, res) => {
  res.json({ message: `Hello ${req.user.role}, you're authorized.` });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`MediRescue server running on port ${PORT}`));