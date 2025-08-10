import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: [true, 'Message ID is required'],
    unique: true,
    trim: true,
    // Accept any non-empty string; upstream ensures uniqueness
    minlength: [3, 'Message ID must be at least 3 characters']
  },
  waId: {
    type: String,
    required: [true, 'WhatsApp ID is required'],
    trim: true,
    validate: {
      validator: function(v) {
        const phoneRegex = /^\d{10,15}$/;
        return phoneRegex.test(v);
      },
      message: 'WhatsApp ID must be 10-15 digits'
    }
  },
  fromNumber: {
    type: String,
    required: [true, 'From number is required'],
    trim: true
  },
  toNumber: {
    type: String,
    required: [true, 'To number is required'],
    trim: true
  },
  text: {
    type: String,
    required: [true, 'Message text is required'],
    maxlength: [4096, 'Message cannot exceed 4096 characters'],
    trim: true
  },
  body: {
    type: String,
    maxlength: [4096, 'Message body cannot exceed 4096 characters'],
    trim: true
  },
  type: {
    type: String,
    enum: {
      values: ['incoming', 'outgoing'],
      message: 'Type must be either incoming or outgoing'
    },
    required: [true, 'Message type is required']
  },
  status: {
    type: String,
    enum: {
      values: ['sending', 'sent', 'delivered', 'read', 'failed', 'pending', 'queued'],
      message: 'Invalid message status'
    },
    default: 'sent',
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  messageType: {
    type: String,
    enum: {
      values: ['text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact', 'system'],
      message: 'Invalid message type'
    },
    default: 'text',
    index: true
  },
  mediaData: {
    url: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Media URL must be valid'
      }
    },
    mimeType: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*$/.test(v);
        },
        message: 'Invalid MIME type'
      }
    },
    fileSize: {
      type: Number,
      min: [0, 'File size cannot be negative'],
      max: [50 * 1024 * 1024, 'File size cannot exceed 50MB'] // 50MB limit
    },
    fileName: {
      type: String,
      maxlength: [255, 'Filename cannot exceed 255 characters']
    },
    thumbnail: String,
    duration: Number, // For audio/video files
    width: Number, // For images/videos
    height: Number, // For images/videos
    caption: {
      type: String,
      maxlength: [1024, 'Caption cannot exceed 1024 characters']
    }
  },
  contextInfo: {
    quotedMessage: {
      messageId: String,
      text: {
        type: String,
        maxlength: [500, 'Quoted text cannot exceed 500 characters']
      },
      sender: String,
      timestamp: Date
    },
    forwardingScore: {
      type: Number,
      default: 0,
      min: [0, 'Forwarding score cannot be negative']
    },
    isForwarded: {
      type: Boolean,
      default: false
    },
    mentions: [{
      waId: String,
      name: String
    }],
    replyTo: {
      messageId: String,
      text: String,
      sender: String
    }
  },
  webhookData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    // Store webhook-specific data
    demo_message: Boolean,
    source: String,
    frontend_url: String,
    webhook_id: String,
    processing_time: Number
  },
  metadata: {
    platform: {
      type: String,
      default: 'whatsapp-web-clone',
      enum: ['whatsapp-web-clone', 'whatsapp-api', 'manual', 'system']
    },
    userAgent: String,
    ipAddress: String,
    deviceInfo: String,
    readAt: Date,
    deliveredAt: Date,
    sentAt: Date,
    // Enhanced metadata for frontend integration
    origin: String, // Frontend origin for tracking
    sessionId: String,
    retryCount: {
      type: Number,
      default: 0,
      max: [5, 'Maximum 5 retry attempts allowed']
    },
    errorReason: String,
    processingTime: Number,
    // Message tracking
    edited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    originalText: String,
    // Delivery tracking
    deliveryAttempts: {
      type: Number,
      default: 0
    },
    lastDeliveryAttempt: Date
  },
  // Frontend compatibility fields
  fromMe: {
    type: Boolean,
    default: function() {
      return this.type === 'outgoing';
    }
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    default: function() {
      return this.type === 'outgoing' ? 'outbound' : 'inbound';
    }
  },
  // System message handling
  system: {
    type: Boolean,
    default: false
  },
  systemMessageType: {
    type: String,
    enum: ['contact_added', 'contact_blocked', 'chat_cleared', 'user_joined', 'user_left'],
    default: null
  }
  }, {
  timestamps: true,
  collection: 'messages',
  // Add transformation for JSON output
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive fields from JSON output
      delete ret.__v;
      delete ret.metadata?.ipAddress;
      delete ret.metadata?.userAgent;
      delete ret.metadata?.deviceInfo;
      
      // Ensure frontend compatibility
      if (!ret.body) ret.body = ret.text;
      if (!ret.fromMe) ret.fromMe = ret.type === 'outgoing';
      if (!ret.direction) ret.direction = ret.type === 'outgoing' ? 'outbound' : 'inbound';
      
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// ✅ Optimized Indexes for Production Performance
messageSchema.index({ waId: 1, timestamp: -1 }); // Primary conversation sorting
messageSchema.index({ type: 1, status: 1 }); // Status filtering
messageSchema.index({ messageType: 1, timestamp: -1 }); // Media message filtering
messageSchema.index({ text: 'text' }); // Text search functionality
messageSchema.index({ timestamp: -1 }); // Recent messages
messageSchema.index({ status: 1, timestamp: -1 }); // Status-based queries
messageSchema.index({ fromNumber: 1, timestamp: -1 }); // Sender-based queries
messageSchema.index({ toNumber: 1, timestamp: -1 }); // Receiver-based queries

// Compound indexes for complex frontend queries
messageSchema.index({ waId: 1, type: 1, timestamp: -1 }); // Conversation with type filter
messageSchema.index({ waId: 1, status: 1, timestamp: -1 }); // Conversation with status filter
messageSchema.index({ waId: 1, messageType: 1, timestamp: -1 }); // Media messages in conversation

// Virtual fields for frontend compatibility
messageSchema.virtual('content').get(function() {
  return this.body || this.text;
});

messageSchema.virtual('isMedia').get(function() {
  return this.messageType !== 'text' && this.mediaData && this.mediaData.url;
});

messageSchema.virtual('formattedTime').get(function() {
  if (!this.timestamp) return '';
  return this.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});

messageSchema.virtual('isRecent').get(function() {
  if (!this.timestamp) return false;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return this.timestamp > oneHourAgo;
});

// Enhanced pre-save middleware
messageSchema.pre('save', function(next) {
  // Ensure body and text are synchronized
  if (this.text && !this.body) {
    this.body = this.text;
  } else if (this.body && !this.text) {
    this.text = this.body;
  }
  
  // Set fromMe based on type
  this.fromMe = this.type === 'outgoing';
  this.direction = this.type === 'outgoing' ? 'outbound' : 'inbound';
  
  // Update status timestamps
  const now = new Date();
  if (this.status === 'sent' && !this.metadata.sentAt) {
    this.metadata.sentAt = now;
  } else if (this.status === 'delivered' && !this.metadata.deliveredAt) {
    this.metadata.deliveredAt = now;
  } else if (this.status === 'read' && !this.metadata.readAt) {
    this.metadata.readAt = now;
  }
  
  // Auto-generate messageId if not provided
  if (!this.messageId) {
    this.messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Initialize metadata if not exists
  if (!this.metadata) {
    this.metadata = {
      platform: 'whatsapp-web-clone',
      sentAt: now
    };
  }
  
  next();
});

// Post-save middleware for logging
messageSchema.post('save', function(doc) {
  if (this.isNew) {
    console.log(`📨 New message saved: ${doc.messageId} - ${doc.type} - ${doc.waId}`);
  } else {
    console.log(`🔄 Message updated: ${doc.messageId} - Status: ${doc.status}`);
  }
});

// Enhanced static methods
messageSchema.statics.getConversation = async function(waId, limit = 50, skip = 0) {
  try {
    console.log(`💬 Fetching conversation for ${waId} (limit: ${limit}, skip: ${skip})`);
    
    const messages = await this.find({ 
      waId,
      system: { $ne: true } // Exclude system messages by default
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
    
    // Return in ascending order for frontend display
    const sortedMessages = messages.reverse();
    
    console.log(`✅ Retrieved ${sortedMessages.length} messages for ${waId}`);
    return sortedMessages;
    
  } catch (error) {
    console.error('❌ Error fetching conversation:', error);
    throw error;
  }
};

// Get messages with enhanced filtering for frontend
messageSchema.statics.getMessagesForFrontend = async function(waId, options = {}) {
  try {
    const {
      limit = 50,
      skip = 0,
      messageType = null,
      status = null,
      includeSystem = false
    } = options;

    const query = { waId };
    
    if (!includeSystem) {
      query.system = { $ne: true };
    }
    
    if (messageType) {
      query.messageType = messageType;
    }
    
    if (status) {
      query.status = status;
    }

    const messages = await this.find(query)
      .sort({ timestamp: 1 }) // Ascending for frontend display
      .limit(limit)
      .skip(skip)
      .lean();

    // Transform for frontend compatibility
    return messages.map(msg => ({
      _id: msg._id,
      messageId: msg.messageId,
      body: msg.body || msg.text,
      text: msg.text || msg.body,
      fromMe: msg.type === 'outgoing',
      type: msg.type,
      direction: msg.type === 'outgoing' ? 'outbound' : 'inbound',
      status: msg.status,
      timestamp: msg.timestamp,
      messageType: msg.messageType,
      media: msg.mediaData ? {
        url: msg.mediaData.url,
        filename: msg.mediaData.fileName,
        filesize: msg.mediaData.fileSize,
        mimetype: msg.mediaData.mimeType,
        caption: msg.mediaData.caption
      } : null,
      waId: msg.waId,
      source: 'api',
      createdAt: msg.createdAt,
      contextInfo: msg.contextInfo,
      system: msg.system || false
    }));

  } catch (error) {
    console.error('❌ Error fetching messages for frontend:', error);
    throw error;
  }
};

// Search messages
messageSchema.statics.searchMessages = async function(waId, searchTerm, limit = 20) {
  try {
    const searchRegex = new RegExp(searchTerm, 'i');
    
    return await this.find({
      waId,
      $or: [
        { text: searchRegex },
        { body: searchRegex },
        { 'mediaData.caption': searchRegex }
      ]
    })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
    
  } catch (error) {
    console.error('❌ Error searching messages:', error);
    throw error;
  }
};

// Get unread messages count
messageSchema.statics.getUnreadCount = async function(waId) {
  try {
    return await this.countDocuments({
      waId,
      type: 'incoming',
      status: { $ne: 'read' }
    });
  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    return 0;
  }
};

// Enhanced instance methods
messageSchema.methods.markAsRead = async function() {
  if (this.status !== 'read') {
    this.status = 'read';
    this.metadata.readAt = new Date();
    return await this.save();
  }
  return this;
};

messageSchema.methods.markAsDelivered = async function() {
  if (this.status === 'sent') {
    this.status = 'delivered';
    this.metadata.deliveredAt = new Date();
    return await this.save();
  }
  return this;
};

messageSchema.methods.markAsFailed = async function(reason = 'Unknown error') {
  this.status = 'failed';
  this.metadata.errorReason = reason;
  this.metadata.retryCount = (this.metadata.retryCount || 0) + 1;
  return await this.save();
};

// Edit message method
messageSchema.methods.editMessage = async function(newText) {
  if (this.type !== 'outgoing') {
    throw new Error('Can only edit outgoing messages');
  }
  
  this.metadata.originalText = this.text;
  this.text = newText;
  this.body = newText;
  this.metadata.edited = true;
  this.metadata.editedAt = new Date();
  
  return await this.save();
};

// Frontend-compatible format method
messageSchema.methods.toFrontendFormat = function() {
  return {
    _id: this._id,
    messageId: this.messageId,
    body: this.body || this.text,
    text: this.text || this.body,
    fromMe: this.type === 'outgoing',
    type: this.type,
    direction: this.type === 'outgoing' ? 'outbound' : 'inbound',
    status: this.status,
    timestamp: this.timestamp,
    messageType: this.messageType,
    media: this.mediaData ? {
      url: this.mediaData.url,
      filename: this.mediaData.fileName,
      filesize: this.mediaData.fileSize,
      mimetype: this.mediaData.mimeType,
      caption: this.mediaData.caption
    } : null,
    waId: this.waId,
    source: 'api',
    createdAt: this.createdAt,
    system: this.system || false
  };
};

// Error handling for duplicate messageIds
messageSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error(`Message with ID ${doc.messageId} already exists`));
  } else {
    next(error);
  }
});

const Message = mongoose.model('Message', messageSchema);

// Also expose a model that points to the processed_messages collection (assignment requirement)
const ProcessedMessage = mongoose.models.ProcessedMessage
  || mongoose.model('ProcessedMessage', messageSchema, 'processed_messages');

export { ProcessedMessage };
export default Message;
