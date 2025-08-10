import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import connectDatabase from './src/config/database.js';
import messageRoutes from './src/routes/messageRoutes.js';
import errorHandler, { notFoundHandler, asyncHandler } from './src/middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000; // Updated to match your Render deployment
const isProduction = process.env.NODE_ENV === 'production';

// ============================================
// ENVIRONMENT VALIDATION
// ============================================

const validateEnvironment = () => {
  const required = ['MONGODB_URI'];
  const recommended = ['FRONTEND_URL', 'WHATSAPP_PHONE_NUMBER'];
  
  const missing = required.filter(key => !process.env[key]);
  const missingRecommended = recommended.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    if (isProduction) {
      process.exit(1);
    }
  }
  
  if (missingRecommended.length > 0 && isProduction) {
    console.warn('⚠️ Missing recommended environment variables:', missingRecommended);
  }
  
  console.log('✅ Environment variables validated');
  console.log('🔧 Configuration loaded:');
  console.log(`   📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   🌐 Frontend URL: ${process.env.FRONTEND_URL || 'Not configured'}`);
  console.log(`   📱 WhatsApp Number: ${process.env.WHATSAPP_PHONE_NUMBER || 'Not configured'}`);
  console.log(`   🏠 Port: ${PORT}`);
};

// Initialize
validateEnvironment();

// ============================================
// DATABASE CONNECTION
// ============================================

const initializeDatabase = async () => {
  try {
    await connectDatabase();
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    if (isProduction) {
      process.exit(1);
    }
  }
};

// Connect to database
initializeDatabase();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Enhanced Helmet configuration for WhatsApp Web Clone
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "wss:", "ws:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: isProduction ? [] : null
    },
  },
  hsts: isProduction ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
}));

// Rate Limiting
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: {
    success: false,
    message,
    retryAfter: Math.ceil(windowMs / 1000),
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`🚦 Rate limit exceeded for ${req.ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
      retryAfter: Math.ceil(windowMs / 1000),
      timestamp: new Date().toISOString()
    });
  }
});

// Different rate limits for different endpoints
app.use('/api/messages/send', createRateLimit(60 * 1000, 30, 'Too many messages sent')); // 30 messages per minute
app.use('/api/contacts', createRateLimit(60 * 1000, 20, 'Too many contact operations')); // 20 contacts per minute
app.use('/api', createRateLimit(60 * 1000, 100, 'Too many API requests')); // 100 requests per minute for API
app.use(createRateLimit(15 * 60 * 1000, 1000, 'Too many requests')); // 1000 requests per 15 minutes globally

// ============================================
// PERFORMANCE MIDDLEWARE
// ============================================

app.use(compression({
  level: isProduction ? 6 : 1,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// ============================================
// LOGGING MIDDLEWARE
// ============================================

if (isProduction) {
  app.use(morgan('combined', {
    skip: (req) => req.url === '/health' // Skip health check logs in production
  }));
} else {
  app.use(morgan('dev'));
}

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - startTime;
    const origin = req.get('origin') || 'No origin';
    
    if (req.url !== '/health') { // Skip health check logs
      console.log(`📡 ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - Origin: ${origin}`);
    }
    
    originalSend.call(this, data);
  };
  
  next();
});

// ============================================
// CORS CONFIGURATION
// ============================================

const corsOptions = {
  origin: function (origin, callback) {
    const explicitOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4173',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ].filter(Boolean);

    const allowedPatterns = [
      /https?:\/\/.*\.vercel\.app$/i,
      /https?:\/\/.*\.vercel\.dev$/i,
      /https?:\/\/.*\.onrender\.com$/i
    ];

    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    const isExplicitAllowed = explicitOrigins.some((o) => origin === o || origin.startsWith(o));
    const isPatternAllowed = allowedPatterns.some((re) => re.test(origin));

    if (isExplicitAllowed || isPatternAllowed || (!isProduction && origin.startsWith('http://localhost'))) {
      return callback(null, true);
    }

    console.warn(`🚫 CORS blocked origin: ${origin}`);
    console.warn(`🔍 Allowed explicit origins:`, explicitOrigins);
    return callback(new Error(`CORS policy violation: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// ============================================
// BODY PARSING MIDDLEWARE
// ============================================

app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        message: 'Invalid JSON format',
        error: 'JSON_PARSE_ERROR',
        timestamp: new Date().toISOString()
      });
      return;
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000
}));

// ============================================
// TRUST PROXY CONFIGURATION
// ============================================

if (isProduction) {
  app.set('trust proxy', 1);
  console.log('🔒 Trust proxy enabled for production');
}

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

// Basic health check
app.get('/health', asyncHandler(async (req, res) => {
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    database: {
      name: process.env.DB_NAME || 'whatsapp',
      status: 'connected' // You could add actual DB ping here
    },
    frontend: process.env.FRONTEND_URL || 'Not configured',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid
    }
  };

  res.status(200).json(healthData);
}));

// Detailed health check
app.get('/health/detailed', asyncHandler(async (req, res) => {
  try {
    // Test database connection
    const mongoose = await import('mongoose');
    const dbStatus = mongoose.default.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Get some basic stats
    const { Message, Contact } = await Promise.all([
      import('./src/models/Message.js'),
      import('./src/models/Contact.js')
    ]);
    
    const [messageCount, contactCount] = await Promise.all([
      Message.default.countDocuments().catch(() => 0),
      Contact.default.countDocuments().catch(() => 0)
    ]);

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      database: {
        status: dbStatus,
        name: process.env.DB_NAME || 'whatsapp',
        collections: {
          messages: messageCount,
          contacts: contactCount
        }
      },
      frontend: process.env.FRONTEND_URL || 'Not configured',
      api: {
        port: PORT,
        cors: corsOptions.origin.toString().substring(0, 100),
        rateLimit: 'enabled'
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        pid: process.pid,
        cpuUsage: process.cpuUsage()
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

// ============================================
// ROOT ENDPOINT
// ============================================

app.get('/', (req, res) => {
  res.json({
    api: 'WhatsApp Web Clone Backend API',
    version: '1.0.0',
    status: 'Active',
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DB_NAME || 'whatsapp',
    frontend: process.env.FRONTEND_URL || 'Not configured',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /health',
      detailedHealth: 'GET /health/detailed',
      conversations: 'GET /api/conversations',
      messages: 'GET /api/messages/:waId',
      sendMessage: 'POST /api/messages/send',
      addContact: 'POST /api/contacts',
      markAsRead: 'PUT /api/messages/:waId/read',
      search: 'GET /api/search/messages?q=query',
      stats: 'GET /api/stats',
      status: 'GET /api/status'
    },
    documentation: {
      github: 'https://github.com/yourusername/whatsapp-web-clone',
      frontend: process.env.FRONTEND_URL || 'https://whatsapp-web-clone-gamma.vercel.app'
    }
  });
});

// ============================================
// API ROUTES
// ============================================

app.use('/api', messageRoutes);

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

// 404 Handler for unknown routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received. Initiating graceful shutdown...`);
  
  try {
    // Close database connection
    const mongoose = await import('mongoose');
    await mongoose.default.connection.close();
    console.log('✅ Database connection closed');
    
    // Additional cleanup can be added here
    console.log('✅ Cleanup completed');
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
  } finally {
    console.log('👋 Server shutdown completed');
    process.exit(0);
  }
};

// Signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart

// ============================================
// ERROR HANDLERS
// ============================================

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:');
  console.error('   Message:', error.message);
  console.error('   Stack:', error.stack);
  console.error('   Time:', new Date().toISOString());
  
  if (isProduction) {
    // In production, try to shut down gracefully
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  } else {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection:');
  console.error('   Promise:', promise);
  console.error('   Reason:', reason);
  console.error('   Time:', new Date().toISOString());
  
  if (isProduction) {
    // In production, try to shut down gracefully
    gracefulShutdown('UNHANDLED_REJECTION');
  } else {
    process.exit(1);
  }
});

// ============================================
// SERVER STARTUP
// ============================================

const startServer = async () => {
  try {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('🚀 WhatsApp Web Clone Backend Server Started Successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📡 Server running on: http://localhost:${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🏠 Port: ${PORT}`);
      console.log(`🌍 Frontend URL: ${process.env.FRONTEND_URL || 'https://whatsapp-web-clone-gamma.vercel.app'}`);
      console.log(`💾 Database: ${process.env.DB_NAME || 'whatsapp'} on MongoDB Atlas`);
      console.log(`📱 WhatsApp Number: ${process.env.WHATSAPP_PHONE_NUMBER || 'Not configured'}`);
      console.log(`🔒 Security: ${isProduction ? 'Production mode' : 'Development mode'}`);
      console.log(`⏰ Started at: ${new Date().toISOString()}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('📍 Available Endpoints:');
      console.log('   🏥 Health Check: GET /health');
      console.log('   📊 Detailed Health: GET /health/detailed');
      console.log('   💬 Conversations: GET /api/conversations');
      console.log('   📨 Messages: GET /api/messages/:waId');
      console.log('   📤 Send Message: POST /api/messages/send');
      console.log('   👤 Add Contact: POST /api/contacts');
      console.log('   👁️ Mark Read: PUT /api/messages/:waId/read');
      console.log('   🔍 Search: GET /api/search/messages');
      console.log('   📊 Stats: GET /api/stats');
      console.log('');
      
      if (!process.env.FRONTEND_URL && !isProduction) {
        console.log('⚠️  REMINDER: Update FRONTEND_URL environment variable after frontend deployment!');
        console.log('   Add this to your .env file: FRONTEND_URL=https://your-app-name.vercel.app');
        console.log('');
      }
      
      if (isProduction) {
        console.log('🔐 Production mode active - Enhanced security and logging enabled');
      } else {
        console.log('🛠️ Development mode active - Detailed logging and CORS relaxed');
      }
      console.log('');
    });

    // Set server timeout for long-running requests
    server.timeout = 30000; // 30 seconds

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
const server = startServer();

export default app;
