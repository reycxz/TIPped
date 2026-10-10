const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

require('./cronJobs');

// Connect to MongoDB
connectDB();

const app = express();
const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  process.env.FRONTEND_URL ||
  'http://localhost:3000,http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const server = http.createServer(app);
require('./socket').initializeSocket(server);

// Middleware
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const reportRoutes = require('./routes/reportRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const adminDataRoutes = require('./routes/adminDataRoutes');

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'TIPped Backend API is running' });
});

// Authentication Routes
app.use('/api/auth', authRoutes);

// Admin Management Routes (Strict Hard Delete endpoints)
app.use('/api/admin', adminRoutes);

// User Management Routes
app.use('/api/users', userRoutes);

// Ticket & Report Routes
app.use('/api/tickets', ticketRoutes);
app.use('/api/reports', reportRoutes);

// Admin Data Routes (Departments & Categories)
app.use('/api/departments', departmentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin-data', adminDataRoutes);

// NoSQL Injection Prevention Middleware (Recursively sanitizes input keys)
const sanitizeInput = (data) => {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeInput);

  const clean = {};
  for (const key of Object.keys(data)) {
    // Strip operators starting with '$' or containing '.'
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    clean[key] = sanitizeInput(data[key]);
  }
  return clean;
};

app.use((req, res, next) => {
  if (req.body) req.body = sanitizeInput(req.body);
  if (req.query) req.query = sanitizeInput(req.query);
  if (req.params) req.params = sanitizeInput(req.params);
  next();
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Resilient Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Error Handler]:', err.stack || err.message);

  // Multer Error Handling (File size & count bounds)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds maximum limit of 5MB per image' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Cannot upload more than 5 images' });
    }
    return res.status(400).json({ error: err.message || 'File upload limit exceeded' });
  }

  // Multer custom file filter errors
  if (err.message && err.message.includes('Only image files are allowed')) {
    return res.status(400).json({ error: 'Only image files (JPEG, PNG, WebP) are allowed' });
  }

  // Mongoose CastError (Invalid ObjectIds)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid resource identifier format' });
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: messages.join(', ') });
  }

  const statusCode = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, prevent leaking internal credentials, connection strings, or stack traces
  const safeMessage = (statusCode === 500 && isProduction)
    ? 'Internal Server Error'
    : (err.message || 'Internal Server Error');

  res.status(statusCode).json({
    error: safeMessage
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

module.exports = app;
