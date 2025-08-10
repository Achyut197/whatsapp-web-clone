import Message from '../models/Message.js';
import Contact from '../models/Contact.js';

export const getConversations = async (req, res) => {
  try {
    console.log('📋 Fetching conversations for frontend:', req.get('origin'));
    
    // Get all active contacts with recent activity
    const contacts = await Contact.find({
      isActive: true,
      isBlocked: { $ne: true }
    })
    .sort({ lastMessageTime: -1, createdAt: -1 })
    .lean();

    console.log(`📊 Found ${contacts.length} contacts`);

    // Enrich contacts with message data
    const conversations = await Promise.all(
      contacts.map(async (contact) => {
        const lastMessage = await Message.findOne({
          waId: contact.waId
        })
        .sort({ timestamp: -1 })
        .lean();

        const unreadCount = await Message.countDocuments({
          waId: contact.waId,
          type: 'incoming',
          status: { $ne: 'read' }
        });

        return {
          _id: contact._id,
          waId: contact.waId,
          name: contact.name || `Contact ${contact.waId}`,
          profilePic: contact.profilePic || null,
          lastMessage: lastMessage?.text || lastMessage?.body || contact.lastMessage || 'Click to start messaging',
          lastMessageTime: lastMessage?.timestamp || contact.lastMessageTime || contact.createdAt,
          unreadCount: unreadCount || 0,
          type: lastMessage ? (lastMessage.type || 'incoming') : 'none',
          status: lastMessage?.status || 'none',
          isBlocked: contact.isBlocked || false,
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt || contact.lastMessageTime
        };
      })
    );

    // Sort by last message time
    conversations.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    console.log(`✅ Returning ${conversations.length} enriched conversations`);

    // ✅ CRITICAL FIX: Return conversations directly for frontend
    res.json({
      success: true,
      conversations: conversations, // ✅ Frontend expects this exact structure
      count: conversations.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      conversations: [], // ✅ Always return empty array on error
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

    // Get messages using your Message model's method
    const messages = await Message.find({ waId })
      .sort({ timestamp: 1 }) // Ascending order for chat display
      .limit(limit)
      .skip(skip)
      .lean();

    const contact = await Contact.findOne({ waId }).lean();

    console.log(`📨 Found ${messages.length} messages for ${contact?.name || waId}`);

    // Transform messages for perfect frontend compatibility
    const transformedMessages = messages.map(msg => ({
      _id: msg._id,
      messageId: msg.messageId,
      body: msg.text || msg.body || '', // Ensure body exists
      text: msg.text || msg.body || '', // Ensure text exists
      fromMe: msg.type === 'outgoing' || msg.fromMe === true,
      type: msg.type || 'incoming',
      direction: msg.type === 'outgoing' ? 'outbound' : 'inbound',
      status: msg.status || 'sent',
      timestamp: msg.timestamp || msg.createdAt,
      messageType: msg.messageType || 'text',
      mediaData: msg.mediaData || null,
      media: msg.mediaData ? {
        url: msg.mediaData.url,
        filename: msg.mediaData.fileName,
        filesize: msg.mediaData.fileSize,
        mimetype: msg.mediaData.mimeType,
        caption: msg.mediaData.caption
      } : null,
      contextInfo: msg.contextInfo || null,
      webhookData: msg.webhookData || null,
      source: 'api',
      waId: msg.waId,
      createdAt: msg.createdAt || msg.timestamp
    }));

    // ✅ CRITICAL FIX: Return messages directly for frontend
    res.json({
      success: true,
      messages: transformedMessages, // ✅ Frontend expects this exact structure
      contact: {
        _id: contact?._id,
        waId: contact?.waId || waId,
        name: contact?.name || `Contact ${waId}`,
        profilePic: contact?.profilePic || null
      },
      count: transformedMessages.length,
      pagination: {
        limit,
        skip,
        total: transformedMessages.length,
        hasMore: transformedMessages.length === limit
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      messages: [], // ✅ Always return empty array on error
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { waId, text, body, messageType = 'text' } = req.body;
    const messageContent = text || body;

    if (!waId || !messageContent) {
      return res.status(400).json({
        success: false,
        message: 'waId and message content are required'
      });
    }

    console.log(`📤 Sending message to ${waId}: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}"`);

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();

    const message = new Message({
      messageId,
      waId,
      fromNumber: process.env.WHATSAPP_PHONE_NUMBER || '918329446654',
      toNumber: waId,
      text: messageContent,
      body: messageContent, // Ensure both text and body are set
      type: 'outgoing',
      status: 'sent',
      timestamp,
      messageType,
      fromMe: true, // Ensure fromMe is set
      direction: 'outbound', // Ensure direction is set
      webhookData: {
        demo_message: true,
        created_at: timestamp,
        source: 'whatsapp-web-clone',
        frontend_url: process.env.FRONTEND_URL
      },
      metadata: {
        platform: 'whatsapp-web-clone',
        origin: req.get('origin'),
        sentAt: timestamp
      }
    });

    await message.save();
    console.log(`✅ Message saved with ID: ${message.messageId}`);

    // Update contact
    await Contact.findOneAndUpdate(
      { waId },
      {
        $set: {
          lastMessage: messageContent,
          lastMessageTime: timestamp,
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

    // ✅ FIXED: Return message directly for frontend
    res.status(201).json({
      success: true,
      message: { // ✅ Frontend expects response.message
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

export const addNewContact = async (req, res) => {
  try {
    const { waId, name, profilePic } = req.body;

    if (!waId) {
      return res.status(400).json({
        success: false,
        message: 'Phone number (waId) is required'
      });
    }

    // Clean and validate phone number
    const phoneRegex = /^\d{10,15}$/;
    let cleanedWaId = waId.toString().replace(/\D/g, '');

    if (cleanedWaId.length === 10 && !cleanedWaId.startsWith('91')) {
      cleanedWaId = '91' + cleanedWaId;
    }

    if (!phoneRegex.test(cleanedWaId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Please provide 10-15 digits.'
      });
    }

    console.log(`➕ Adding new contact: ${name || cleanedWaId} (${cleanedWaId})`);

    const existingContact = await Contact.findOne({ waId: cleanedWaId });
    
    if (existingContact) {
      console.log(`⚠️ Contact already exists: ${existingContact.name}`);
      return res.json({ // ✅ Return success even if exists
        success: true,
        message: 'Contact already exists',
        contact: {
          _id: existingContact._id,
          waId: existingContact.waId,
          name: existingContact.name,
          profilePic: existingContact.profilePic,
          lastMessage: existingContact.lastMessage || 'Click to start messaging',
          lastMessageTime: existingContact.lastMessageTime || existingContact.createdAt,
          unreadCount: existingContact.unreadCount || 0,
          type: 'contact',
          status: 'active'
        }
      });
    }

    const timestamp = new Date();

    const newContact = new Contact({
      waId: cleanedWaId,
      name: name || `Contact ${cleanedWaId}`,
      profilePic: profilePic || null,
      lastMessage: '',
      lastMessageTime: timestamp,
      unreadCount: 0,
      isBlocked: false,
      isActive: true,
      createdAt: timestamp,
      metadata: {
        phoneNumber: cleanedWaId,
        createdBy: 'manual',
        source: 'whatsapp-web-clone',
        addedFrom: 'frontend',
        origin: req.get('origin')
      }
    });

    await newContact.save();
    console.log(`✅ Created new contact: ${newContact.name} (${newContact.waId})`);

    // ✅ FIXED: Return contact directly for frontend
    res.status(201).json({
      success: true,
      message: 'Contact added successfully',
      contact: {
        _id: newContact._id,
        waId: newContact.waId,
        name: newContact.name,
        profilePic: newContact.profilePic,
        lastMessage: 'Click to start messaging',
        lastMessageTime: newContact.lastMessageTime,
        unreadCount: 0,
        type: 'contact',
        status: 'active'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error adding new contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add contact',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

export const getHealthStatus = async (req, res) => {
  try {
    const messageCount = await Message.countDocuments();
    const contactCount = await Contact.countDocuments();

    res.json({
      success: true,
      status: 'Active', // ✅ Frontend expects "Active" status
      data: {
        status: 'healthy',
        database: 'connected',
        frontend: process.env.FRONTEND_URL,
        stats: {
          totalMessages: messageCount,
          totalContacts: contactCount
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

export const markAsRead = async (req, res) => {
  try {
    const { waId } = req.params;
    
    console.log(`👁️ Marking messages as read for waId: ${waId}`);

    const timestamp = new Date();

    await Contact.findOneAndUpdate(
      { waId },
      {
        unreadCount: 0,
        'metadata.lastSeen': timestamp
      }
    );

    const result = await Message.updateMany(
      {
        waId,
        type: 'incoming',
        status: { $ne: 'read' }
      },
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
      }
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
