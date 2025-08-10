import Message from '../models/Message.js';
import Contact from '../models/Contact.js';

export const getConversations = async (req, res) => {
  try {
    console.log('📋 Fetching conversations...');
    
    const contacts = await Contact.find({ isBlocked: false })
      .sort({ lastMessageTime: -1 })
      .lean();

    console.log(`📊 Found ${contacts.length} conversations`);

    const conversations = contacts.map(contact => ({
      _id: contact._id,
      waId: contact.waId,
      name: contact.name,
      profilePic: contact.profilePic,
      lastMessage: contact.lastMessage || '',
      lastMessageTime: contact.lastMessageTime || new Date(),
      unreadCount: contact.unreadCount || 0,
      isBlocked: contact.isBlocked || false,
      metadata: contact.metadata
    }));

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

    console.log(`💬 Fetching messages for waId: ${waId}`);

    const messages = await Message.find({ waId })
      .sort({ timestamp: 1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const contact = await Contact.findOne({ waId }).lean();

    if (!contact) {
      console.warn(`⚠️ Contact not found for waId: ${waId}`);
    }

    console.log(`📨 Found ${messages.length} messages for ${contact?.name || waId}`);

    res.json({
      success: true,
      data: {
        contact: {
          waId: contact?.waId || waId,
          name: contact?.name || `Contact ${waId}`,
          profilePic: contact?.profilePic || null
        },
        messages: messages.map(msg => ({
          _id: msg._id,
          messageId: msg.messageId,
          text: msg.text,
          type: msg.type,
          status: msg.status,
          timestamp: msg.timestamp,
          messageType: msg.messageType,
          mediaData: msg.mediaData,
          contextInfo: msg.contextInfo,
          webhookData: msg.webhookData
        })),
        pagination: {
          limit,
          skip,
          total: messages.length,
          hasMore: messages.length === limit
        }
      }
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
    const { waId, text, messageType = 'text' } = req.body;

    if (!waId || !text) {
      return res.status(400).json({
        success: false,
        message: 'waId and text are required'
      });
    }

    console.log(`📤 Sending message to ${waId}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

    const message = new Message({
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      waId,
      fromNumber: '918329446654',
      toNumber: waId,
      text,
      type: 'outgoing',
      status: 'sent',
      timestamp: new Date(),
      messageType,
      webhookData: {
        demo_message: true,
        created_at: new Date(),
        source: 'whatsapp-web-clone'
      },
      metadata: {
        platform: 'whatsapp-web-clone',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress
      }
    });

    await message.save();
    console.log(`✅ Message saved with ID: ${message.messageId}`);

    await Contact.findOneAndUpdate(
      { waId },
      {
        lastMessage: text,
        lastMessageTime: new Date(),
        'metadata.lastSeen': new Date()
      },
      { upsert: true }
    );

    console.log(`📝 Updated contact last message for ${waId}`);

    res.status(201).json({
      success: true,
      data: {
        _id: message._id,
        messageId: message.messageId,
        text: message.text,
        type: message.type,
        status: message.status,
        timestamp: message.timestamp,
        messageType: message.messageType
      },
      message: 'Message sent successfully'
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

    console.log(`👁️ Marking messages as read for waId: ${waId}`);

    await Contact.findOneAndUpdate(
      { waId },
      { 
        unreadCount: 0,
        'metadata.lastSeen': new Date()
      }
    );

    const result = await Message.updateMany(
      { 
        waId, 
        type: 'incoming', 
        status: { $ne: 'read' },
        ...(messageIds && messageIds.length > 0 && { messageId: { $in: messageIds } })
      },
      { 
        status: 'read',
        'metadata.readAt': new Date()
      }
    );

    console.log(`✅ Marked ${result.modifiedCount} messages as read for ${waId}`);

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} messages as read`,
      data: {
        waId,
        markedCount: result.modifiedCount
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

export const addNewContact = async (req, res) => {
  try {
    const { waId, name, profilePic } = req.body;

    if (!waId) {
      return res.status(400).json({
        success: false,
        message: 'Phone number (waId) is required'
      });
    }

    const phoneRegex = /^\d{10,15}$/;
    const cleanedWaId = waId.toString().replace(/\D/g, '');
    
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
      return res.status(409).json({
        success: false,
        message: 'Contact already exists',
        data: {
          _id: existingContact._id,
          waId: existingContact.waId,
          name: existingContact.name,
          profilePic: existingContact.profilePic,
          lastMessage: existingContact.lastMessage,
          lastMessageTime: existingContact.lastMessageTime,
          unreadCount: existingContact.unreadCount
        }
      });
    }

    const newContact = new Contact({
      waId: cleanedWaId,
      name: name || `Contact ${cleanedWaId}`,
      profilePic: profilePic || null,
      lastMessage: '',
      lastMessageTime: new Date(),
      unreadCount: 0,
      isBlocked: false,
      metadata: {
        phoneNumber: cleanedWaId,
        createdBy: 'manual',
        source: 'whatsapp-web-clone',
        createdAt: new Date(),
        lastSeen: new Date(),
        isOnline: false
      }
    });

    await newContact.save();
    console.log(`✅ Created new contact: ${newContact.name} (${newContact.waId})`);

    res.status(201).json({
      success: true,
      message: 'Contact added successfully',
      data: {
        _id: newContact._id,
        waId: newContact.waId,
        name: newContact.name,
        profilePic: newContact.profilePic,
        lastMessage: newContact.lastMessage,
        lastMessageTime: newContact.lastMessageTime,
        unreadCount: newContact.unreadCount,
        isBlocked: newContact.isBlocked
      }
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
