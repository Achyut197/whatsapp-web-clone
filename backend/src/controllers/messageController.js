import Message from '../models/Message.js';
import Contact from '../models/Contact.js';

export const getConversations = async (req, res) => {
  try {
    console.log('📋 Fetching conversations for frontend:', req.get('origin'));
    
    // Enhanced query with better sorting and filtering
    const contacts = await Contact.find({ 
      isBlocked: { $ne: true },
      $or: [
        { lastMessage: { $exists: true, $ne: "" } },
        { lastMessageTime: { $exists: true } }
      ]
    })
    .sort({ lastMessageTime: -1, createdAt: -1 })
    .lean();

    console.log(`📊 Found ${contacts.length} conversations`);

    // Enhanced conversation mapping with real message data
    const conversations = await Promise.all(
      contacts.map(async (contact) => {
        // Get actual last message from Message collection
        const lastMessage = await Message.findOne({
          waId: contact.waId
        })
        .sort({ timestamp: -1 })
        .lean();

        // Get unread count from messages
        const unreadCount = await Message.countDocuments({
          waId: contact.waId,
          type: 'incoming',
          status: { $ne: 'read' }
        });

        return {
          _id: contact._id,
          waId: contact.waId,
          name: contact.name || contact.waId,
          profilePic: contact.profilePic || null,
          lastMessage: lastMessage?.text || contact.lastMessage || 'No messages yet',
          lastMessageTime: lastMessage?.timestamp || contact.lastMessageTime || contact.createdAt,
          unreadCount: unreadCount,
          type: lastMessage ? (lastMessage.type || 'incoming') : 'none',
          status: lastMessage?.status || 'none',
          isBlocked: contact.isBlocked || false,
          metadata: contact.metadata || {},
          // Frontend compatibility fields
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt || contact.lastMessageTime
        };
      })
    );

    // Sort by last message time again after enrichment
    conversations.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    console.log(`✅ Returning ${conversations.length} enriched conversations to frontend`);

    res.json({
      success: true,
      data: conversations,
      count: conversations.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { waId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    console.log(`💬 Fetching messages for waId: ${waId} from frontend:`, req.get('origin'));

    // Enhanced message query with proper filtering
    const messages = await Message.find({ waId })
      .sort({ timestamp: 1 }) // Ascending order for chat display
      .limit(limit)
      .skip(skip)
      .lean();

    const contact = await Contact.findOne({ waId }).lean();

    if (!contact) {
      console.warn(`⚠️ Contact not found for waId: ${waId}`);
    }

    console.log(`📨 Found ${messages.length} messages for ${contact?.name || waId}`);

    // Transform messages for frontend compatibility
    const transformedMessages = messages.map(msg => ({
      _id: msg._id,
      messageId: msg.messageId,
      body: msg.text || msg.body, // Frontend expects 'body' field
      text: msg.text || msg.body, // Keep both for compatibility
      fromMe: msg.type === 'outgoing',
      type: msg.type || 'incoming',
      direction: msg.type === 'outgoing' ? 'outbound' : 'inbound',
      status: msg.status || 'sent',
      timestamp: msg.timestamp || msg.createdAt,
      messageType: msg.messageType || 'text',
      mediaData: msg.mediaData || null,
      media: msg.mediaData ? {
        url: msg.mediaData.url,
        filename: msg.mediaData.filename,
        filesize: msg.mediaData.filesize,
        mimetype: msg.mediaData.mimetype
      } : null,
      contextInfo: msg.contextInfo || null,
      webhookData: msg.webhookData || null,
      // Additional frontend fields
      source: 'api',
      waId: msg.waId,
      createdAt: msg.createdAt || msg.timestamp
    }));

    res.json({
      success: true,
      data: {
        contact: {
          _id: contact?._id,
          waId: contact?.waId || waId,
          name: contact?.name || `Contact ${waId}`,
          profilePic: contact?.profilePic || null
        },
        messages: transformedMessages,
        pagination: {
          limit,
          skip,
          total: transformedMessages.length,
          hasMore: transformedMessages.length === limit
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { waId, text, body, messageType = 'text' } = req.body;
    const messageContent = text || body; // Accept both 'text' and 'body' from frontend

    if (!waId || !messageContent) {
      return res.status(400).json({
        success: false,
        message: 'waId and message content are required'
      });
    }

    console.log(`📤 Sending message to ${waId}: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}" from frontend:`, req.get('origin'));

    // Generate unique message ID
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();

    const message = new Message({
      messageId,
      waId,
      fromNumber: process.env.SYSTEM_PHONE_NUMBER || '918329446654',
      toNumber: waId,
      text: messageContent,
      body: messageContent, // Store in both fields for compatibility
      type: 'outgoing',
      status: 'sent',
      timestamp,
      messageType,
      webhookData: {
        demo_message: true,
        created_at: timestamp,
        source: 'whatsapp-web-clone',
        frontend_url: process.env.FRONTEND_URL
      },
      metadata: {
        platform: 'whatsapp-web-clone',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        sentAt: timestamp,
        origin: req.get('origin')
      }
    });

    await message.save();
    console.log(`✅ Message saved with ID: ${message.messageId}`);

    // Update or create contact
    await Contact.findOneAndUpdate(
      { waId },
      {
        $set: {
          lastMessage: messageContent,
          lastMessageTime: timestamp,
          'metadata.lastSeen': timestamp,
          'metadata.lastActivity': timestamp
        },
        $setOnInsert: {
          name: `Contact ${waId}`,
          waId,
          profilePic: null,
          unreadCount: 0,
          isBlocked: false,
          createdAt: timestamp
        }
      },
      { upsert: true, new: true }
    );

    console.log(`📝 Updated contact last message for ${waId}`);

    // Simulate message status progression for frontend
    setTimeout(async () => {
      try {
        await Message.findByIdAndUpdate(message._id, {
          status: 'delivered',
          'metadata.deliveredAt': new Date()
        });
        console.log(`📨 Message ${messageId} marked as delivered`);
      } catch (err) {
        console.warn('⚠️ Failed to update message status to delivered:', err.message);
      }
    }, 1000);

    setTimeout(async () => {
      try {
        await Message.findByIdAndUpdate(message._id, {
          status: 'read',
          'metadata.readAt': new Date()
        });
        console.log(`👁️ Message ${messageId} marked as read`);
      } catch (err) {
        console.warn('⚠️ Failed to update message status to read:', err.message);
      }
    }, 3000);

    // Return frontend-compatible response
    res.status(201).json({
      success: true,
      data: {
        _id: message._id,
        messageId: message.messageId,
        body: message.text,
        text: message.text,
        fromMe: true,
        type: 'outgoing',
        direction: 'outbound',
        status: 'sent',
        timestamp: message.timestamp,
        messageType: message.messageType,
        waId: message.waId,
        source: 'api'
      },
      message: 'Message sent successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { waId } = req.params;
    const { messageIds } = req.body;

    console.log(`👁️ Marking messages as read for waId: ${waId} from frontend:`, req.get('origin'));

    const timestamp = new Date();

    // Update contact unread count
    await Contact.findOneAndUpdate(
      { waId },
      { 
        unreadCount: 0,
        'metadata.lastSeen': timestamp,
        'metadata.lastReadActivity': timestamp
      }
    );

    // Update message status
    const query = { 
      waId, 
      type: 'incoming', 
      status: { $ne: 'read' }
    };

    if (messageIds && messageIds.length > 0) {
      query.messageId = { $in: messageIds };
    }

    const result = await Message.updateMany(
      query,
      { 
        status: 'read',
        'metadata.readAt': timestamp
      }
    );

    console.log(`✅ Marked ${result.modifiedCount} messages as read for ${waId}`);

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} messages as read`,
      data: {
        waId,
        markedCount: result.modifiedCount,
        timestamp
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

export const addNewContact = async (req, res) => {
  try {
    const { waId, name, profilePic } = req.body;

    if (!waId) {
      return res.status(400).json({
        success: false,
        message: 'Phone number (waId) is required'
      });
    }

    // Enhanced phone number validation and formatting
    const phoneRegex = /^\d{10,15}$/;
    let cleanedWaId = waId.toString().replace(/\D/g, '');
    
    // Add country code if missing (default to India +91)
    if (cleanedWaId.length === 10 && !cleanedWaId.startsWith('91')) {
      cleanedWaId = '91' + cleanedWaId;
    }
    
    if (!phoneRegex.test(cleanedWaId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Please provide 10-15 digits.'
      });
    }

    console.log(`➕ Adding new contact: ${name || cleanedWaId} (${cleanedWaId}) from frontend:`, req.get('origin'));

    // Check for existing contact
    const existingContact = await Contact.findOne({ waId: cleanedWaId });
    if (existingContact) {
      console.log(`⚠️ Contact already exists: ${existingContact.name}`);
      
      // Return existing contact in frontend-compatible format
      return res.status(409).json({
        success: false,
        message: 'Contact already exists',
        data: {
          _id: existingContact._id,
          waId: existingContact.waId,
          name: existingContact.name,
          profilePic: existingContact.profilePic,
          lastMessage: existingContact.lastMessage || 'No messages yet',
          lastMessageTime: existingContact.lastMessageTime || existingContact.createdAt,
          unreadCount: existingContact.unreadCount || 0,
          type: 'none',
          status: 'none',
          createdAt: existingContact.createdAt,
          updatedAt: existingContact.updatedAt
        }
      });
    }

    const timestamp = new Date();

    // Create new contact with enhanced metadata
    const newContact = new Contact({
      waId: cleanedWaId,
      name: name || `Contact ${cleanedWaId}`,
      profilePic: profilePic || null,
      lastMessage: '',
      lastMessageTime: timestamp,
      unreadCount: 0,
      isBlocked: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      metadata: {
        phoneNumber: cleanedWaId,
        createdBy: 'manual',
        source: 'whatsapp-web-clone',
        createdAt: timestamp,
        lastSeen: timestamp,
        isOnline: false,
        addedFrom: 'frontend',
        origin: req.get('origin'),
        userAgent: req.headers['user-agent']
      }
    });

    await newContact.save();
    console.log(`✅ Created new contact: ${newContact.name} (${newContact.waId})`);

    // Return frontend-compatible response
    res.status(201).json({
      success: true,
      message: 'Contact added successfully',
      data: {
        _id: newContact._id,
        waId: newContact.waId,
        name: newContact.name,
        profilePic: newContact.profilePic,
        lastMessage: 'Click to start messaging',
        lastMessageTime: newContact.lastMessageTime,
        unreadCount: newContact.unreadCount,
        type: 'none',
        status: 'none',
        isBlocked: newContact.isBlocked,
        createdAt: newContact.createdAt,
        updatedAt: newContact.updatedAt
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error adding new contact:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Contact with this phone number already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to add contact',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Additional utility function for frontend health check
export const getHealthStatus = async (req, res) => {
  try {
    const messageCount = await Message.countDocuments();
    const contactCount = await Contact.countDocuments();
    const recentMessages = await Message.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({
      success: true,
      data: {
        status: 'healthy',
        database: 'connected',
        frontend: process.env.FRONTEND_URL,
        stats: {
          totalMessages: messageCount,
          totalContacts: contactCount,
          recentMessages
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
};
