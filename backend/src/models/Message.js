import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true  // Keep unique: true
    // ❌ CRITICAL: Remove any "index: true" line here
  },
  waId: {
    type: String,
    required: true
    // ❌ CRITICAL: Remove any "index: true" line here
  },
  fromNumber: {
    type: String,
    required: true
  },
  toNumber: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 4096
  },
  type: {
    type: String,
    enum: ['incoming', 'outgoing'],
    required: true
  },
  status: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact'],
    default: 'text'
  },
  mediaData: {
    url: String,
    mimeType: String,
    fileSize: Number,
    fileName: String,
    thumbnail: String
  },
  contextInfo: {
    quotedMessage: {
      messageId: String,
      text: String,
      sender: String
    },
    forwardingScore: {
      type: Number,
      default: 0
    },
    isForwarded: {
      type: Boolean,
      default: false
    }
  },
  webhookData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    platform: {
      type: String,
      default: 'whatsapp-web-clone'
    },
    userAgent: String,
    ipAddress: String,
    deviceInfo: String,
    readAt: Date,
    deliveredAt: Date,
    sentAt: Date
  }
}, {
  timestamps: true,
  collection: 'messages'
});

// ✅ ONLY these explicit index definitions
messageSchema.index({ waId: 1, timestamp: -1 }); // Compound index
messageSchema.index({ type: 1, status: 1 });
messageSchema.index({ messageType: 1, timestamp: -1 });
messageSchema.index({ text: 'text' }); // Text search

// ❌ REMOVE the messageId index since unique: true already creates it
// messageSchema.index({ messageId: 1 }, { unique: true }); // REMOVE THIS LINE

// Pre-save middleware
messageSchema.pre('save', function(next) {
  if (this.status === 'sent' && !this.metadata.sentAt) {
    this.metadata.sentAt = new Date();
  } else if (this.status === 'delivered' && !this.metadata.deliveredAt) {
    this.metadata.deliveredAt = new Date();
  } else if (this.status === 'read' && !this.metadata.readAt) {
    this.metadata.readAt = new Date();
  }
  
  next();
});

messageSchema.statics.getConversation = async function(waId, limit = 50, skip = 0) {
  try {
    const messages = await this.find({ waId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
    
    return messages.reverse();
  } catch (error) {
    console.error('❌ Error fetching conversation:', error);
    throw error;
  }
};

const Message = mongoose.model('Message', messageSchema);

export default Message;
