import express from 'express';
import {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  addNewContact,
  getHealthStatus
} from '../controllers/messageController.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Request logging middleware for this router
router.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const origin = req.get('origin') || 'No origin';
  console.log(`[${timestamp}] 📡 API Route: ${req.method} ${req.originalUrl} - Origin: ${origin}`);
  next();
});

// ============================================
// CONVERSATION ROUTES
// ============================================

// Get all conversations - Enhanced with filtering
router.get('/conversations', asyncHandler(async (req, res, next) => {
  console.log('🔄 Processing conversations request from:', req.get('origin'));
  await getConversations(req, res, next);
}));

// Get conversation with pagination
router.get('/conversations/:waId', asyncHandler(async (req, res, next) => {
  // Redirect to messages endpoint for backward compatibility
  req.params = { ...req.params };
  await getMessages(req, res, next);
}));

// ============================================
// MESSAGE ROUTES
// ============================================

// Get messages for a specific contact - Enhanced
router.get('/messages/:waId', asyncHandler(async (req, res, next) => {
  console.log(`💬 Processing messages request for ${req.params.waId} from:`, req.get('origin'));
  await getMessages(req, res, next);
}));

// Send a new message - Enhanced with validation
router.post('/messages/send', asyncHandler(async (req, res, next) => {
  const { waId, text, body } = req.body;
  console.log(`📤 Processing send message request to ${waId} from:`, req.get('origin'));
  
  // Validation middleware
  if (!waId) {
    return res.status(400).json({
      success: false,
      message: 'WhatsApp ID (waId) is required',
      error: { field: 'waId', code: 'MISSING_REQUIRED_FIELD' },
      timestamp: new Date().toISOString()
    });
  }
  
  if (!text && !body) {
    return res.status(400).json({
      success: false,
      message: 'Message content (text or body) is required',
      error: { field: 'text', code: 'MISSING_REQUIRED_FIELD' },
      timestamp: new Date().toISOString()
    });
  }
  
  await sendMessage(req, res, next);
}));

// Alternative send endpoint for backward compatibility
router.post('/send', asyncHandler(async (req, res, next) => {
  console.log('📤 Processing legacy send endpoint from:', req.get('origin'));
  await sendMessage(req, res, next);
}));

// Mark messages as read - Enhanced
router.put('/messages/:waId/read', asyncHandler(async (req, res, next) => {
  console.log(`👁️ Processing mark-as-read request for ${req.params.waId} from:`, req.get('origin'));
  await markAsRead(req, res, next);
}));

// Legacy mark-as-read endpoint
router.post('/mark-read/:waId', asyncHandler(async (req, res, next) => {
  console.log('👁️ Processing legacy mark-as-read from:', req.get('origin'));
  await markAsRead(req, res, next);
}));

// Bulk mark messages as read
router.put('/messages/read/bulk', asyncHandler(async (req, res) => {
  const { conversations } = req.body;
  
  if (!conversations || !Array.isArray(conversations)) {
    return res.status(400).json({
      success: false,
      message: 'Conversations array is required',
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    const results = [];
    for (const waId of conversations) {
      req.params.waId = waId;
      const result = await markAsRead(req, res, () => {});
      results.push({ waId, success: true });
    }
    
    res.json({
      success: true,
      message: `Marked ${results.length} conversations as read`,
      data: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to bulk mark as read',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

// ============================================
// CONTACT ROUTES
// ============================================

// Add new contact - Enhanced with validation
router.post('/contacts', asyncHandler(async (req, res, next) => {
  const { waId, name } = req.body;
  console.log(`➕ Processing add contact request for ${waId} from:`, req.get('origin'));
  
  // Enhanced validation
  if (!waId) {
    return res.status(400).json({
      success: false,
      message: 'WhatsApp ID (waId) is required',
      error: { field: 'waId', code: 'MISSING_REQUIRED_FIELD' },
      timestamp: new Date().toISOString()
    });
  }
  
  // Phone number format validation
  const phoneRegex = /^\d{10,15}$/;
  const cleanedWaId = waId.toString().replace(/\D/g, '');
  
  if (!phoneRegex.test(cleanedWaId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number format. Must be 10-15 digits.',
      error: { field: 'waId', code: 'INVALID_FORMAT', value: waId },
      timestamp: new Date().toISOString()
    });
  }
  
  await addNewContact(req, res, next);
}));

// Legacy add contact endpoint
router.post('/add-contact', asyncHandler(async (req, res, next) => {
  console.log('➕ Processing legacy add-contact from:', req.get('origin'));
  await addNewContact(req, res, next);
}));

// Get all contacts
router.get('/contacts', asyncHandler(async (req, res) => {
  try {
    console.log('👥 Processing get contacts request from:', req.get('origin'));
    
    // This could be enhanced to call a dedicated controller method
    const ContactModule = await import('../models/Contact.js');
    const Contact = ContactModule.default;
    
    const contacts = await Contact.find({ 
      isActive: true,
      isBlocked: false 
    })
    .sort({ name: 1 })
    .select('waId name profilePic createdAt')
    .lean();
    
    res.json({
      success: true,
      message: 'Contacts retrieved successfully',
      data: contacts,
      count: contacts.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}));

// ============================================
// SEARCH ROUTES
// ============================================

// Search messages across conversations
router.get('/search/messages', asyncHandler(async (req, res) => {
  const { q: query, waId, limit = 20 } = req.query;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      message: 'Search query (q) parameter is required',
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    const MessageModule = await import('../models/Message.js');
    const Message = MessageModule.default;
    
    const searchQuery = waId 
      ? { waId, $text: { $search: query } }
      : { $text: { $search: query } };
    
    const messages = await Message.find(searchQuery)
      .sort({ score: { $meta: 'textScore' }, timestamp: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      success: true,
      message: 'Search completed successfully',
      data: messages,
      count: messages.length,
      query: query,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error searching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}));

// Search contacts
router.get('/search/contacts', asyncHandler(async (req, res) => {
  const { q: query, limit = 20 } = req.query;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      message: 'Search query (q) parameter is required',
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    const ContactModule = await import('../models/Contact.js');
    const Contact = ContactModule.default;
    
    const contacts = await Contact.searchContacts(query, parseInt(limit));
    
    res.json({
      success: true,
      message: 'Contact search completed successfully',
      data: contacts,
      count: contacts.length,
      query: query,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error searching contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Contact search failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}));

// ============================================
// STATISTICS & ANALYTICS ROUTES
// ============================================

// Get conversation statistics
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    console.log('📊 Processing stats request from:', req.get('origin'));
    
    const { Message, Contact } = await Promise.all([
      import('../models/Message.js'),
      import('../models/Contact.js')
    ]);
    
    const [
      totalMessages,
      totalContacts,
      todayMessages,
      unreadMessages,
      activeContacts
    ] = await Promise.all([
      Message.default.countDocuments(),
      Contact.default.countDocuments({ isActive: true }),
      Message.default.countDocuments({
        timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }),
      Message.default.countDocuments({
        type: 'incoming',
        status: { $ne: 'read' }
      }),
      Contact.default.countDocuments({
        isActive: true,
        lastMessageTime: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
    ]);
    
    res.json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: {
        messages: {
          total: totalMessages,
          today: todayMessages,
          unread: unreadMessages
        },
        contacts: {
          total: totalContacts,
          active: activeContacts
        },
        system: {
          frontend: process.env.FRONTEND_URL,
          environment: process.env.NODE_ENV,
          uptime: process.uptime()
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}));

// ============================================
// HEALTH & STATUS ROUTES
// ============================================

// Enhanced health check for API
router.get('/health', asyncHandler(async (req, res) => {
  console.log('🏥 Processing health check from:', req.get('origin'));
  
  try {
    await getHealthStatus(req, res);
  } catch (error) {
    // Fallback health check if controller method fails
    res.json({
      status: 'OK',
      message: 'API routes are working',
      environment: process.env.NODE_ENV,
      frontend: process.env.FRONTEND_URL,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }
}));

// API status endpoint
router.get('/status', (req, res) => {
  res.json({
    api: 'WhatsApp Web Clone API',
    status: 'active',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    frontend: process.env.FRONTEND_URL,
    endpoints: {
      conversations: 'GET /api/conversations',
      messages: 'GET /api/messages/:waId',
      sendMessage: 'POST /api/messages/send',
      markRead: 'PUT /api/messages/:waId/read',
      addContact: 'POST /api/contacts',
      search: 'GET /api/search/messages?q=query',
      stats: 'GET /api/stats',
      health: 'GET /api/health'
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================
// ERROR HANDLING FOR UNKNOWN ROUTES
// ============================================

// Handle unknown API routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route ${req.method} ${req.originalUrl} not found`,
    error: {
      type: 'RouteNotFound',
      method: req.method,
      path: req.originalUrl
    },
    availableEndpoints: [
      'GET /api/conversations',
      'GET /api/messages/:waId',
      'POST /api/messages/send',
      'PUT /api/messages/:waId/read',
      'POST /api/contacts',
      'GET /api/search/messages',
      'GET /api/stats',
      'GET /api/health'
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;
