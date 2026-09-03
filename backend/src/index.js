const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config/config');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const rootRouter = require('./routes/index');
const cookieParser = require('cookie-parser');
const matrimonialSocket = require('./services/matrimonialSocket');
const { chatSocketService } = require('./services/chatSocketService');
const { setIO } = require('./services/socketRegistry');

// Load optional security middlewares with try-catch fallbacks to prevent crashes
let helmet;
try {
  helmet = require('helmet');
} catch (e) {
  console.warn('helmet package not loaded - run npm install to activate');
}

let mongoSanitize;
try {
  mongoSanitize = require('express-mongo-sanitize');
} catch (e) {
  console.warn('express-mongo-sanitize package not loaded - run npm install to activate');
}

let rateLimit;
try {
  rateLimit = require('express-rate-limit');
} catch (e) {
  console.warn('express-rate-limit package not loaded - run npm install to activate');
}

const { initEventReminderRunner } = require('./services/eventReminderRunner');

const app = express();

// Connect to Database
connectDB();

// Initialize Event Reminder Scheduled Task
initEventReminderRunner();

// Global Middlewares
const rawAllowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(url => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  const normalizedOrigin = origin.replace(/\/+$/, '');

  if (rawAllowedOrigins.includes(normalizedOrigin)) return true;
  if (process.env.NODE_ENV === 'development') return true;
  if (/^http:\/\/localhost(:\d+)?$/.test(normalizedOrigin)) return true;
  if (/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(normalizedOrigin)) return true;
  if (/^https:\/\/([a-zA-Z0-9_-]+\.)*vercel\.app$/.test(normalizedOrigin)) return true;

  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS Policy Violation: Origin ${origin} not allowed.`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-refresh-token', 'Accept']
}));

if (helmet) {
  app.use(helmet());
}

if (mongoSanitize) {
  app.use(mongoSanitize());
}

if (rateLimit && process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000,
    message: { status: 'error', message: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use('/api', limiter);
}
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Root API Router
app.use('/api/v1', rootRouter);

// 404 Route handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Global Error Handling Middleware
app.use(errorHandler);

// ─── Socket.io Setup ─────────────────────────────────────────────────────────
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Socket.io CORS Policy Violation: Origin ${origin} not allowed.`), false);
    },
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// Register socket handlers
matrimonialSocket(io);       // Handles matrimonial:* events (backward compat)
chatSocketService(io);       // Handles chat:* events (member, group, community, support)
setIO(io);                   // Store io in registry for service-layer access

// Attach io to app for access in controllers
app.set('io', io);
console.log('[Socket.io] Both matrimonialSocket and chatSocketService registered.');

module.exports = { app, httpServer };
