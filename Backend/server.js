// server.js - WITH SOCKET.IO ADDED
require("dotenv").config();
const express = require('express');
const http = require('http'); // ✅ ADD THIS - For creating HTTP server
const socketIo = require('socket.io'); // ✅ ADD THIS
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken'); // ✅ ADD THIS - For socket auth
const User = require('./models/User'); // ✅ ADD THIS - For socket auth
const globalAudit = require('./middleware/globalAudit');
const AuditService = require('./services/auditService');
const SubscriptionService = require('./services/subscriptionService');
const checkSubscription = require('./middleware/checkSubscription');
const CronManager = require('./config/cron');

const app = express();

// ==================== CREATE HTTP SERVER WITH SOCKET.IO ====================
const server = http.createServer(app); // ✅ ADD THIS - Create HTTP server
const io = socketIo(server, {  // ✅ ADD THIS - Attach Socket.io
  cors: {
    origin: function (origin, callback) {
      const allowedOrigins = [
        'http://localhost:5173',
        // 'https://cap-mis.vercel.app',
        // 'https://cap-mis.ilelio.rw'
      ];
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// Make io accessible to routes and middleware
app.set('io', io);

// ==================== SOCKET.IO AUTHENTICATION MIDDLEWARE ====================
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id)
      .select('firstName lastName email role schoolId isActive');
    
    if (!user || !user.isActive) {
      return next(new Error('User not found or inactive'));
    }
    
    // Attach user to socket
    socket.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId
    };
    
    // Join role-based rooms
    socket.join(`user_${user._id}`);
    socket.join(`role_${user.role}`);
    
    if (user.schoolId) {
      socket.join(`school_${user.schoolId}`);
    }
    
    next();
  } catch (error) {
    console.error('Socket auth error:', error.message);
    next(new Error('Authentication failed'));
  }
});

// ==================== SOCKET.IO CONNECTION HANDLER ====================
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id} - User: ${socket.user?.email} (${socket.user?.role})`);
  
  // Join custom room for this specific user
  if (socket.user) {
    socket.join(`user_${socket.user.id}`);
  }
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id} - User: ${socket.user?.email}`);
  });
  
  // Handle ping for keeping connection alive
  socket.on('ping', () => {
    socket.emit('pong');
  });
  
  // Handle subscription to specific audit streams
  socket.on('subscribe:audit', (filters) => {
    console.log(`📡 User ${socket.user?.email} subscribed to audit with filters:`, filters);
    socket.join('audit_stream');
  });
  
  socket.on('unsubscribe:audit', () => {
    socket.leave('audit_stream');
  });
});

// ==================== EXPORT IO FOR USE IN OTHER FILES ====================
module.exports.io = io;

// ==================== CORS CONFIGURATION ====================
const allowedOrigins = [
  //'https://cap-mis.vercel.app',
  'http://localhost:5173',
  //'https://cap-mis.ilelio.rw'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️ Blocked CORS request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Headers'
  ],
  exposedHeaders: ['Content-Disposition'],
  maxAge: 86400,
};

app.use(cors(corsOptions));

// Handle preflight requests
//app.options('/*', cors(corsOptions));

// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security headers
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

// ==================== MONGOOSE CONNECTION ====================
const uri = process.env.MONGO_URI;

mongoose.connect(uri, {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 60000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 30000,
  heartbeatFrequencyMS: 30000,
  retryWrites: true,
  retryReads: true,
})
.then(() => console.log('✅ MongoDB → CAP_mis connected successfully'))
.catch(e => {
  console.error('❌ MongoDB connection error:', e.message);
  console.log('📌 Please check:');
  console.log('   1. Is MongoDB Atlas cluster running?');
  console.log('   2. Is IP whitelisted in Atlas?');
  console.log('   3. Are credentials correct in .env?');
});

mongoose.connection.on('connected', () => {
  console.log('📊 MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// ==================== ROUTES ====================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    socketio: io ? 'ready' : 'not initialized',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'CAP_mis Backend API',
    version: '1.0.0',
    status: 'operational',
    socketio: true,
    endpoints: [
      '/api/auth',
      '/api/card',
      '/api/students',
      '/api/templates',
      '/api/permissions',
      '/api/analytics',
      '/api/audit'
    ]
  });
});

// Audit Middleware
app.use(globalAudit);

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/card', require('./routes/card'), checkSubscription);
app.use('/api/students', require('./routes/student'), checkSubscription);
app.use('/api/templates', require('./routes/templates'), checkSubscription);
app.use('/api/permissions', require('./routes/permissions'), checkSubscription);
app.use('/api/analytics', require('./routes/analytics'), checkSubscription);
app.use('/api/staff', require('./routes/staff'), checkSubscription);
app.use('/api/audit', require('./routes/audit'), checkSubscription);
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/plans', require('./routes/plans'));

// Test routes (disable in production if needed)
if (process.env.NODE_ENV !== 'production') {
  const testTextBeeRoutes = require('./routes/testTextBee');
  app.use('/api/test', testTextBeeRoutes);
}

// ==================== ERROR HANDLING ====================
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

app.use((err, req, res, next) => {
  console.error('🔥 Global error:', err);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'Cross-origin request blocked',
      message: 'Your origin is not allowed to access this API'
    });
  }
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== SUBSCRIPTION SERVICE ====================
SubscriptionService.init();

// ==================== SERVER START (using server variable, not app.listen) ====================
const PORT = process.env.PORT || 5000;

// ✅ IMPORTANT: Use server.listen instead of app.listen
server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 CAP_mis Backend Server`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ CORS Allowed Origins: ${allowedOrigins.join(', ')}`);
  console.log(`🔌 Socket.io: Enabled and ready`);
  console.log('='.repeat(50));
  
  console.log('📝 Configuration:');
  console.log(`   - MongoDB: ${process.env.MONGO_URI ? 'Configured' : 'Missing'}`);
  console.log(`   - Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? 'Configured' : 'Missing'}`);
  console.log(`   - TextBee: ${process.env.TEXTBEE_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`   - Socket.io: Real-time audit events enabled`);
  
  // Start cron jobs after server is running
  CronManager.init();
});

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  CronManager.stopAll();
  io.close(() => {
    console.log('Socket.io closed');
    server.close(() => {
      console.log('HTTP server closed');
      mongoose.connection.close(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
      });
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  CronManager.stopAll();
  io.close(() => {
    console.log('Socket.io closed');
    server.close(() => {
      console.log('HTTP server closed');
      mongoose.connection.close(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
      });
    });
  });
});