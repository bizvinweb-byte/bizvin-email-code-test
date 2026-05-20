// Capture the port and socket assigned dynamically by the hosting environment (Passenger/Hostinger/LiteSpeed) before loading dotenv
console.log('--- STARTUP ENV DIAGNOSTIC ---');
console.log('Initial process.env.PORT:', process.env.PORT);
console.log('Initial process.env.LSNODE_SOCKET:', process.env.LSNODE_SOCKET);
console.log('All process.env keys:', Object.keys(process.env));
console.log('------------------------------');
const HOSTING_PORT = process.env.PORT;
const HOSTING_SOCKET = process.env.LSNODE_SOCKET;

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';

import connectDB from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import emailConfigRoutes from './routes/emailConfigRoutes.js';

dotenv.config();

// Restore hosting port and socket if they were overwritten by .env
if (HOSTING_PORT) {
  process.env.PORT = HOSTING_PORT;
}
if (HOSTING_SOCKET) {
  process.env.LSNODE_SOCKET = HOSTING_SOCKET;
}

// Connect DB
connectDB();

// Scheduler
import './utils/schedulerService.js';

const app = express();

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000'
    ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.indexOf(origin) === -1 &&
      process.env.NODE_ENV === 'production'
    ) {
      return callback(
        new Error('CORS policy does not allow this origin'),
        false
      );
    }

    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/email-configs', emailConfigRoutes);

// DB Status Diagnostic Route
app.get('/api/db-status', (req, res) => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  const dbUriRaw = process.env.MONGODB_URI;
  const isUriPresent = !!dbUriRaw;
  const dbUriMasked = isUriPresent 
    ? `${dbUriRaw.substring(0, 15)}... (${dbUriRaw.length} chars)`
    : 'undefined';

  res.json({
    readyState: mongoose.connection.readyState,
    status: states[mongoose.connection.readyState] || 'unknown',
    isUriPresent,
    dbUriMasked,
    envKeysAvailable: Object.keys(process.env).filter(k => k !== 'MONGODB_URI' && k !== 'JWT_SECRET'),
    hasJwtSecret: !!process.env.JWT_SECRET,
    nodeVersion: process.version
  });
});

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static assets in production or if the public folder exists
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  
  // All other GET routes should serve the index.html for SPA routing (excluding API routes)
  app.get(/.*/, (req, res, next) => {
    // If it's an API route that wasn't matched, don't serve index.html
    if (req.path.startsWith('/api')) {
      return next();
    }
    const indexFile = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexFile)) {
      res.sendFile(indexFile);
    } else {
      next();
    }
  });
} else {
  // Test Route when public folder is not present (e.g. in local development)
  app.get('/', (req, res) => {
    res.send('Backend Running Successfully');
  });
}

const PORT = process.env.LSNODE_SOCKET || process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV || 'development'} mode on ${
      process.env.LSNODE_SOCKET ? 'socket ' + PORT : 'port ' + PORT
    }`
  );
});