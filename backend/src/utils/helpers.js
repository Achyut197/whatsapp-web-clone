import crypto from 'crypto';

// ============================================
// MESSAGE ID GENERATION
// ============================================

// Generate unique message ID with enhanced format
export const generateMessageId = (prefix = 'msg') => {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(6).toString('hex');
  const nodeId = process.env.NODE_ID || 'node1'; // For multi-instance deployments
  
  return `${prefix}_${timestamp}_${randomBytes}_${nodeId}`;
};

// Generate webhook-compatible message ID
export const generateWebhookMessageId = () => {
  return `whook_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
};

// Generate conversation ID
export const generateConversationId = (waId) => {
  return `conv_${waId}_${crypto.randomBytes(4).toString('hex')}`;
};

// ============================================
// PHONE NUMBER UTILITIES
// ============================================

// Enhanced phone number formatting with country detection
export const formatPhoneNumber = (phoneNumber, defaultCountry = 'IN') => {
  if (!phoneNumber) return null;
  
  const cleaned = phoneNumber.toString().replace(/\D/g, '');
  
  // Handle different country codes
  const countryPrefixes = {
    'IN': '91',    // India
    'US': '1',     // United States
    'UK': '44',    // United Kingdom
    'AE': '971',   // UAE
    'SA': '966',   // Saudi Arabia
    'CA': '1',     // Canada
    'AU': '61',    // Australia
  };
  
  const prefix = countryPrefixes[defaultCountry] || '91';
  
  // Add country code if missing
  if (!cleaned.startsWith(prefix) && cleaned.length === 10) {
    return `${prefix}${cleaned}`;
  }
  
  // Handle US/Canada numbers (special case for +1)
  if (prefix === '1' && cleaned.length === 10) {
    return `1${cleaned}`;
  }
  
  return cleaned;
};

// Extract country code from phone number
export const extractCountryCode = (phoneNumber) => {
  const cleaned = phoneNumber.toString().replace(/\D/g, '');
  
  const countryCodes = {
    '91': 'IN',   // India
    '1': 'US',    // US/Canada (needs length check)
    '44': 'UK',   // United Kingdom
    '971': 'AE',  // UAE
    '966': 'SA',  // Saudi Arabia
    '61': 'AU',   // Australia
    '81': 'JP',   // Japan
    '86': 'CN',   // China
  };
  
  // Check for different country code lengths
  for (let i = 3; i >= 1; i--) {
    const prefix = cleaned.substring(0, i);
    if (countryCodes[prefix]) {
      return { code: prefix, country: countryCodes[prefix] };
    }
  }
  
  return { code: '91', country: 'IN' }; // Default to India
};

// Format phone number for display
export const formatPhoneForDisplay = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  const cleaned = phoneNumber.toString().replace(/\D/g, '');
  
  // Format based on length and pattern
  if (cleaned.length >= 12) {
    // International format: +91 98765 43210
    return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 7)} ${cleaned.substring(7)}`;
  } else if (cleaned.length === 11) {
    // US format: +1 234 567 8900
    return `+${cleaned.substring(0, 1)} ${cleaned.substring(1, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
  } else if (cleaned.length === 10) {
    // Local format: 98765 43210
    return `${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
  }
  
  return `+${cleaned}`;
};

// ============================================
// WHATSAPP ID VALIDATION
// ============================================

// Enhanced WhatsApp ID validation
export const isValidWaId = (waId) => {
  if (!waId) return false;
  
  const cleaned = waId.toString().replace(/\D/g, '');
  
  // WhatsApp ID validation rules:
  // - Must be 10-15 digits
  // - Cannot start with 0
  // - Must be a valid phone number format
  const waIdRegex = /^[1-9]\d{9,14}$/;
  
  if (!waIdRegex.test(cleaned)) {
    return false;
  }
  
  // Additional validation for known invalid patterns
  const invalidPatterns = [
    /^1{10,}$/,     // All 1s
    /^0+$/,         // All 0s
    /^9{10,}$/,     // All 9s
    /^12345/,       // Sequential numbers
    /^11111/,       // Repeated digits
  ];
  
  return !invalidPatterns.some(pattern => pattern.test(cleaned));
};

// Validate and format WhatsApp ID
export const validateAndFormatWaId = (waId, defaultCountry = 'IN') => {
  try {
    const formatted = formatPhoneNumber(waId, defaultCountry);
    
    if (!formatted || !isValidWaId(formatted)) {
      return {
        isValid: false,
        formatted: null,
        error: 'Invalid WhatsApp ID format'
      };
    }
    
    return {
      isValid: true,
      formatted: formatted,
      original: waId,
      countryInfo: extractCountryCode(formatted)
    };
  } catch (error) {
    return {
      isValid: false,
      formatted: null,
      error: error.message
    };
  }
};

// ============================================
// TEXT UTILITIES
// ============================================

// Sanitize message text
export const sanitizeMessageText = (text) => {
  if (!text) return '';
  
  return text
    .trim()
    .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
    .replace(/[\r\n]+/g, '\n')      // Normalize line breaks
    .substring(0, 4096);            // Limit to WhatsApp's character limit
};

// Extract mentions from message text
export const extractMentions = (text) => {
  if (!text) return [];
  
  const mentionRegex = /@(\d{10,15})/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const waId = match[1];
    if (isValidWaId(waId)) {
      mentions.push({
        waId: waId,
        position: match.index,
        length: match[0].length
      });
    }
  }
  
  return mentions;
};

// Generate message preview
export const generateMessagePreview = (text, maxLength = 50) => {
  if (!text) return '';
  
  const sanitized = sanitizeMessageText(text);
  
  if (sanitized.length <= maxLength) {
    return sanitized;
  }
  
  return sanitized.substring(0, maxLength - 3) + '...';
};

// ============================================
// DATE & TIME UTILITIES
// ============================================

// Format timestamp for frontend display
export const formatTimestamp = (timestamp, format = 'short') => {
  if (!timestamp) return '';
  
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    
    switch (format) {
      case 'short':
        if (diffInHours < 1) {
          return 'now';
        } else if (diffInHours < 24) {
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInDays < 7) {
          return date.toLocaleDateString([], { weekday: 'short' });
        } else {
          return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
        }
      
      case 'full':
        return date.toLocaleString();
      
      case 'date':
        return date.toLocaleDateString();
      
      case 'time':
        return date.toLocaleTimeString();
      
      case 'iso':
        return date.toISOString();
      
      default:
        return date.toLocaleString();
    }
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '';
  }
};

// Get time ago string
export const getTimeAgo = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInMs = now - date;
    
    const minutes = Math.floor(diffInMs / (1000 * 60));
    const hours = Math.floor(diffInMs / (1000 * 60 * 60));
    const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  } catch (error) {
    return '';
  }
};

// ============================================
// MEDIA UTILITIES
// ============================================

// Validate media URL
export const isValidMediaUrl = (url) => {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

// Get media type from MIME type
export const getMediaTypeFromMime = (mimeType) => {
  if (!mimeType) return 'unknown';
  
  const mimeTypeMap = {
    'image/': 'image',
    'video/': 'video',
    'audio/': 'audio',
    'application/pdf': 'document',
    'application/msword': 'document',
    'application/vnd.openxmlformats-officedocument': 'document',
    'text/': 'document'
  };
  
  for (const [prefix, type] of Object.entries(mimeTypeMap)) {
    if (mimeType.startsWith(prefix)) {
      return type;
    }
  }
  
  return 'document';
};

// Format file size
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// ============================================
// SECURITY UTILITIES
// ============================================

// Generate secure hash
export const generateSecureHash = (data) => {
  return crypto.createHash('sha256').update(data.toString()).digest('hex');
};

// Generate API key
export const generateApiKey = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Mask sensitive data for logging
export const maskSensitiveData = (data, fieldsToMask = ['password', 'token', 'apiKey']) => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const masked = { ...data };
  
  fieldsToMask.forEach(field => {
    if (masked[field]) {
      const value = masked[field].toString();
      masked[field] = value.substring(0, 4) + '*'.repeat(Math.max(value.length - 8, 0)) + value.substring(value.length - 4);
    }
  });
  
  return masked;
};

// ============================================
// VALIDATION UTILITIES
// ============================================

// Validate URL
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate JSON string
export const isValidJson = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

// ============================================
// ERROR UTILITIES
// ============================================

// Create standardized error object
export const createError = (message, code, status = 500, details = null) => {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.details = details;
  error.timestamp = new Date().toISOString();
  return error;
};

// Format error for API response
export const formatErrorForApi = (error, includeStack = false) => {
  return {
    success: false,
    error: {
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      status: error.status || 500,
      details: error.details || null,
      ...(includeStack && { stack: error.stack })
    },
    timestamp: new Date().toISOString()
  };
};

// ============================================
// LOGGING UTILITIES
// ============================================

// Create structured log entry
export const createLogEntry = (level, message, metadata = {}) => {
  return {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    metadata: {
      ...metadata,
      nodeId: process.env.NODE_ID || 'node1',
      environment: process.env.NODE_ENV || 'development'
    }
  };
};

// ============================================
// FRONTEND INTEGRATION UTILITIES
// ============================================

// Transform data for frontend compatibility
export const transformForFrontend = (data, type = 'message') => {
  if (!data) return null;
  
  switch (type) {
    case 'message':
      return {
        _id: data._id,
        messageId: data.messageId,
        body: data.body || data.text,
        text: data.text || data.body,
        fromMe: data.fromMe || data.type === 'outgoing',
        type: data.type,
        direction: data.type === 'outgoing' ? 'outbound' : 'inbound',
        status: data.status,
        timestamp: data.timestamp,
        messageType: data.messageType || 'text',
        waId: data.waId,
        source: 'api'
      };
    
    case 'contact':
      return {
        _id: data._id,
        waId: data.waId,
        name: data.name,
        profilePic: data.profilePic,
        lastMessage: data.lastMessage || 'No messages yet',
        lastMessageTime: data.lastMessageTime,
        unreadCount: data.unreadCount || 0,
        displayName: data.name || data.waId
      };
    
    default:
      return data;
  }
};

// Generate CORS headers for frontend
export const getCorsHeaders = (origin) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'https://localhost:5173'
  ].filter(Boolean);
  
  const isAllowed = allowedOrigins.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true'
  };
};

export default {
  generateMessageId,
  generateWebhookMessageId,
  generateConversationId,
  formatPhoneNumber,
  extractCountryCode,
  formatPhoneForDisplay,
  isValidWaId,
  validateAndFormatWaId,
  sanitizeMessageText,
  extractMentions,
  generateMessagePreview,
  formatTimestamp,
  getTimeAgo,
  isValidMediaUrl,
  getMediaTypeFromMime,
  formatFileSize,
  generateSecureHash,
  generateApiKey,
  maskSensitiveData,
  isValidUrl,
  isValidEmail,
  isValidJson,
  createError,
  formatErrorForApi,
  createLogEntry,
  transformForFrontend,
  getCorsHeaders
};
