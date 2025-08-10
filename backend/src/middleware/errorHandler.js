const errorHandler = (err, req, res, next) => {
  console.error('❌ Error Handler Triggered:');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('🕒 Timestamp:', new Date().toISOString());
  console.error('🌐 Origin:', req.get('origin') || 'No origin');
  console.error('📍 Endpoint:', `${req.method} ${req.originalUrl}`);
  console.error('🔍 Error Stack:', err.stack);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // MongoDB Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message,
      value: error.value
    }));
    
    console.error('🚫 Validation Error:', errors);
    
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errors,
      type: 'ValidationError',
      timestamp: new Date().toISOString(),
      endpoint: req.originalUrl
    });
  }

  // MongoDB Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const value = err.keyValue[field];
    
    console.error(`🔒 Duplicate Key Error - Field: ${field}, Value: ${value}`);
    
    return res.status(409).json({
      success: false,
      message: `Duplicate ${field}: ${value} already exists`,
      error: {
        type: 'DuplicateError',
        field: field,
        value: value
      },
      timestamp: new Date().toISOString(),
      endpoint: req.originalUrl
    });
  }

  // MongoDB Cast Error (Invalid ObjectId)
  if (err.name === 'CastError') {
    console.error(`🎯 Cast Error - Path: ${err.path}, Value: ${err.value}`);
    
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
      error: {
        type: 'CastError',
        field: err.path,
        value: err.value
      },
      timestamp: new Date().toISOString(),
      endpoint: req.originalUrl
    });
  }

  // CORS Related Errors
  if (err.message === 'CORS policy violation' || err.message.includes('CORS')) {
    const origin = req.get('origin');
    console.error(`🚫 CORS Error - Origin: ${origin}, Allowed: ${process.env.FRONTEND_URL}`);
    
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      error: {
        type: 'CORSError',
        origin: origin,
        allowedOrigin: process.env.FRONTEND_URL
      },
      timestamp: new Date().toISOString()
    });
  }

  // JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    console.error('🔐 JWT Error:', err.message);
    
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token',
      error: {
        type: 'AuthenticationError',
        details: err.message
      },
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    console.error('⏰ JWT Expired:', err.expiredAt);
    
    return res.status(401).json({
      success: false,
      message: 'Authentication token expired',
      error: {
        type: 'TokenExpiredError',
        expiredAt: err.expiredAt
      },
      timestamp: new Date().toISOString()
    });
  }

  // MongoDB Connection Errors
  if (err.name === 'MongoNetworkError' || err.message.includes('ENOTFOUND')) {
    console.error('🌐 MongoDB Network Error:', err.message);
    
    return res.status(503).json({
      success: false,
      message: 'Database connection error',
      error: {
        type: 'DatabaseConnectionError',
        details: process.env.NODE_ENV === 'development' ? err.message : 'Service temporarily unavailable'
      },
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'MongoServerError') {
    console.error('🗄️ MongoDB Server Error:', err.message);
    
    return res.status(500).json({
      success: false,
      message: 'Database server error',
      error: {
        type: 'DatabaseServerError',
        code: err.code,
        details: process.env.NODE_ENV === 'development' ? err.message : 'Database operation failed'
      },
      timestamp: new Date().toISOString()
    });
  }

  // WhatsApp API Related Errors
  if (err.message.includes('WhatsApp') || err.message.includes('webhook')) {
    console.error('📱 WhatsApp API Error:', err.message);
    
    return res.status(502).json({
      success: false,
      message: 'WhatsApp API error',
      error: {
        type: 'WhatsAppAPIError',
        details: process.env.NODE_ENV === 'development' ? err.message : 'External service error'
      },
      timestamp: new Date().toISOString()
    });
  }

  // Rate Limiting Errors
  if (err.message.includes('rate limit') || err.status === 429) {
    console.error('🚦 Rate Limit Error:', err.message);
    
    return res.status(429).json({
      success: false,
      message: 'Too many requests',
      error: {
        type: 'RateLimitError',
        retryAfter: err.retryAfter || '1 minute'
      },
      timestamp: new Date().toISOString()
    });
  }

  // File Upload Errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    console.error('📁 File Size Error:', err.message);
    
    return res.status(413).json({
      success: false,
      message: 'File too large',
      error: {
        type: 'FileSizeError',
        limit: err.limit,
        field: err.field
      },
      timestamp: new Date().toISOString()
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    console.error('📁 Unexpected File Error:', err.message);
    
    return res.status(400).json({
      success: false,
      message: 'Unexpected file upload',
      error: {
        type: 'FileUploadError',
        field: err.field
      },
      timestamp: new Date().toISOString()
    });
  }

  // Syntax Errors (Invalid JSON, etc.)
  if (err.type === 'entity.parse.failed' || err.message.includes('JSON')) {
    console.error('📝 JSON Parse Error:', err.message);
    
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format',
      error: {
        type: 'JSONParseError',
        details: 'Please check your request format'
      },
      timestamp: new Date().toISOString()
    });
  }

  // Custom Application Errors
  if (err.isOperational) {
    console.error('⚙️ Operational Error:', err.message);
    
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
      error: {
        type: 'OperationalError',
        details: err.details || 'Application error'
      },
      timestamp: new Date().toISOString()
    });
  }

  // Frontend Integration Errors
  if (req.get('origin') === process.env.FRONTEND_URL) {
    console.error('🎯 Frontend Request Error - Providing detailed response');
  }

  // Default Internal Server Error
  console.error('💥 Unhandled Error:', {
    name: err.name,
    message: err.message,
    code: err.code,
    status: err.status
  });

  // Different response format for development vs production
  const errorResponse = {
    success: false,
    message: 'Internal Server Error',
    error: {
      type: 'InternalServerError',
      details: process.env.NODE_ENV === 'development' 
        ? {
            name: err.name,
            message: err.message,
            stack: err.stack,
            code: err.code
          }
        : 'Something went wrong on our end'
    },
    timestamp: new Date().toISOString(),
    endpoint: req.originalUrl,
    method: req.method
  };

  // Log to external service in production (if configured)
  if (process.env.NODE_ENV === 'production') {
    // Log to external monitoring service
    logErrorToService(err, req);
  }

  res.status(err.status || err.statusCode || 500).json(errorResponse);
};

// Helper function to log errors to external service
const logErrorToService = (err, req) => {
  try {
    // You can integrate with services like Sentry, LogRocket, etc.
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        origin: req.get('origin'),
        userAgent: req.get('user-agent'),
        ip: req.ip
      },
      environment: process.env.NODE_ENV,
      frontend: process.env.FRONTEND_URL,
      backend: `${req.protocol}://${req.get('host')}`
    };

    // Log to console for now (replace with actual service)
    console.log('📊 Error logged to monitoring service:', JSON.stringify(errorLog, null, 2));
    
    // Example integration with external service:
    // await sendToErrorTrackingService(errorLog);
    
  } catch (logError) {
    console.error('❌ Failed to log error to external service:', logError.message);
  }
};

// 404 Route Handler (should be used in server.js)
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route ${req.method} ${req.originalUrl} not found`);
  error.status = 404;
  error.isOperational = true;
  
  console.warn('🔍 404 Error:', {
    method: req.method,
    url: req.originalUrl,
    origin: req.get('origin'),
    timestamp: new Date().toISOString()
  });

  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    error: {
      type: 'NotFoundError',
      availableEndpoints: [
        'GET /health',
        'GET /api/conversations',
        'GET /api/messages/:waId',
        'POST /api/messages/send',
        'POST /api/contacts',
        'PUT /api/messages/:waId/read'
      ]
    },
    timestamp: new Date().toISOString()
  });
};

// Async error handler wrapper
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default errorHandler;
