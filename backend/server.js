import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';

import connectDatabase from './src/config/database.js';
import messageRoutes from './src/routes/messageRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Environment Variables Validation
const validateEnvironment = () => {
  const required = ['MONGODB_URI'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    if (isProduction) {
      process.exit(1);
    }
  }
  
  console.log('✅ Environment variables validated');
};

// Validate environment and connect to database
validateEnvironment();
connectDatabase();

// Security & Performance Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(compression());

// Logging
if (isProduction) {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// CORS Configuration with Testing URL
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,                           // Production frontend URL
      'https://whatsapp-frontend-testing.vercel.app',    // 🧪 TEMPORARY TESTING URL
      'https://your-app-name.vercel.app',                // 🧪 PLACEHOLDER FOR YOUR ACTUAL VERCEL URL
      'http://localhost:3000',                           // Local development
      'http://localhost:5173',                           // Vite dev server
      'http://localhost:4173'                            // Vite preview
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowedOrigin => origin.startsWith(allowedOrigin))) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body Parsing
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy (important for Render)
if (isProduction) {
  app.set('trust proxy', 1);
}

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    database: process.env.DB_NAME || 'whatsapp'
  });
});

// Root Route
app.get('/', (req, res) => {
  res.json({
    message: 'WhatsApp Web Clone Backend API',
    version: '1.0.0',
    status: 'Active',
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DB_NAME || 'whatsapp',
    endpoints: {
      health: 'GET /health',
      conversations: 'GET /api/conversations',
      messages: 'GET /api/messages/:waId',
      sendMessage: 'POST /api/send',
      addContact: 'POST /api/add-contact',
      markAsRead: 'POST /api/mark-read/:waId'
    }
  });
});

// API Routes
app.use('/api', messageRoutes);

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /',
      'GET /health',
      'GET /api/conversations',
      'GET /api/messages/:waId',
      'POST /api/send',
      'POST /api/add-contact',
      'POST /api/mark-read/:waId'
    ]
  });
});

// Global Error Handler
app.use((error, req, res, next) => {
  console.error('Global Error Handler:', {
    message: error.message,
    stack: isProduction ? 'Hidden in production' : error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  res.status(error.status || 500).json({
    success: false,
    message: isProduction 
      ? 'Something went wrong on our end. Please try again.' 
      : error.message,
    ...((!isProduction) && { 
      stack: error.stack,
      url: req.url,
      method: req.method 
    })
  });
});

// Graceful Shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WhatsApp Backend Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'Using testing URLs'}`);
  console.log(`💾 Database: ${process.env.DB_NAME || 'whatsapp'} on MongoDB Atlas`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  
  if (!process.env.FRONTEND_URL && !isProduction) {
    console.log(`\n⚠️  REMINDER: Update FRONTEND_URL environment variable after frontend deployment!`);
  }
});

export default app;
