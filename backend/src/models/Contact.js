import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  waId: {
    type: String,
    required: [true, 'WhatsApp ID is required'],
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Enhanced phone number validation
        const phoneRegex = /^\d{10,15}$/;
        return phoneRegex.test(v);
      },
      message: 'WhatsApp ID must be 10-15 digits'
    }
  },
  name: {
    type: String,
    required: [true, 'Contact name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
    minlength: [1, 'Name must be at least 1 character']
  },
  profilePic: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^https?:\/\/.+\..+/.test(v);
      },
      message: 'Profile picture must be a valid URL'
    }
  },
  lastMessage: {
    type: String,
    default: '',
    maxlength: [1000, 'Last message cannot exceed 1000 characters']
  },
  lastMessageTime: {
    type: Date,
    default: Date.now,
    index: true // For sorting conversations
  },
  unreadCount: {
    type: Number,
    default: 0,
    min: [0, 'Unread count cannot be negative'],
    max: [9999, 'Unread count cannot exceed 9999']
  },
  isBlocked: {
    type: Boolean,
    default: false,
    index: true // For filtering blocked contacts
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true // For soft deletion
  },
  metadata: {
    phoneNumber: {
      type: String,
      default: function() { return this.waId; }
    },
    country: {
      type: String,
      maxlength: 3,
      uppercase: true
    },
    countryCode: {
      type: String,
      maxlength: 4
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 50
    }],
    createdBy: {
      type: String,
      enum: ['webhook', 'manual', 'import', 'api', 'frontend'],
      default: 'webhook'
    },
    source: {
      type: String,
      default: 'whatsapp-web-clone',
      enum: ['whatsapp-web-clone', 'whatsapp-api', 'manual', 'import']
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    // Enhanced metadata for frontend integration
    addedFrom: {
      type: String,
      enum: ['frontend', 'backend', 'webhook', 'import'],
      default: 'webhook'
    },
    firstMessageTime: {
      type: Date,
      default: Date.now
    },
    totalMessages: {
      type: Number,
      default: 0,
      min: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    // Frontend tracking
    frontendOrigin: String,
    userAgent: String,
    ipAddress: String
  }
}, {
  timestamps: true,
  collection: 'contacts',
  // Add transformation for JSON output
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive fields from JSON output
      delete ret.__v;
      delete ret.metadata?.ipAddress;
      delete ret.metadata?.userAgent;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// ✅ Optimized Indexes for Production
contactSchema.index({ lastMessageTime: -1 }); // Sort conversations by recent activity
contactSchema.index({ 'metadata.createdBy': 1 }); // Filter by creation source
contactSchema.index({ isBlocked: 1 }); // Filter blocked contacts
contactSchema.index({ isActive: 1 }); // Filter active contacts
contactSchema.index({ unreadCount: -1 }); // Sort by unread messages
contactSchema.index({ 'metadata.tags': 1 }); // Search by tags
contactSchema.index({ createdAt: -1 }); // Sort by creation date
contactSchema.index({ 'metadata.lastActivity': -1 }); // Sort by last activity

// Compound indexes for complex queries
contactSchema.index({ isBlocked: 1, isActive: 1, lastMessageTime: -1 }); // Active conversations
contactSchema.index({ waId: 1, isActive: 1 }); // Quick contact lookup

// Virtual fields for frontend compatibility
contactSchema.virtual('displayName').get(function() {
  return this.name || this.waId || 'Unknown Contact';
});

contactSchema.virtual('formattedPhone').get(function() {
  if (!this.waId) return '';
  
  // Format phone number for display
  const phone = this.waId;
  if (phone.length >= 12) {
    return `+${phone.substring(0, 2)} ${phone.substring(2, 7)} ${phone.substring(7)}`;
  }
  return `+${phone}`;
});

contactSchema.virtual('isRecentlyActive').get(function() {
  if (!this.metadata?.lastActivity) return false;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return this.metadata.lastActivity > oneHourAgo;
});

contactSchema.virtual('hasUnreadMessages').get(function() {
  return this.unreadCount > 0;
});

// Enhanced pre-save middleware
contactSchema.pre('save', function(next) {
  // Clean and format phone number
  if (this.waId) {
    this.waId = this.waId.replace(/\D/g, '');
    
    // Auto-add country code if missing (default to India +91)
    if (this.waId.length === 10 && !this.waId.startsWith('91')) {
      this.waId = '91' + this.waId;
    }
  }
  
  // Auto-generate name if not provided
  if (!this.name && this.waId) {
    this.name = `Contact ${this.waId}`;
  }
  
  // Update metadata
  if (this.metadata) {
    this.metadata.phoneNumber = this.waId;
    this.metadata.lastActivity = new Date();
    
    // Extract country code
    if (this.waId && this.waId.length >= 2) {
      this.metadata.countryCode = this.waId.substring(0, 2);
    }
  }
  
  // Ensure metadata exists
  if (!this.metadata) {
    this.metadata = {
      phoneNumber: this.waId,
      lastActivity: new Date(),
      firstMessageTime: new Date()
    };
  }
  
  next();
});

// Post-save middleware for logging
contactSchema.post('save', function(doc) {
  if (this.isNew) {
    console.log(`✅ New contact created: ${doc.name} (${doc.waId}) - Source: ${doc.metadata?.createdBy}`);
  } else {
    console.log(`🔄 Contact updated: ${doc.name} (${doc.waId})`);
  }
});

// Enhanced static methods
contactSchema.statics.findOrCreate = async function(contactData) {
  try {
    let contact = await this.findOne({ 
      waId: contactData.waId,
      isActive: true 
    });
    
    if (!contact) {
      // Create new contact with enhanced data
      const enhancedData = {
        ...contactData,
        metadata: {
          ...contactData.metadata,
          firstMessageTime: new Date(),
          totalMessages: 0,
          lastActivity: new Date()
        }
      };
      
      contact = new this(enhancedData);
      await contact.save();
      console.log(`✅ Created new contact: ${contact.name} (${contact.waId})`);
    } else {
      // Update existing contact
      Object.assign(contact, contactData);
      contact.metadata.lastActivity = new Date();
      await contact.save();
      console.log(`🔄 Updated existing contact: ${contact.name} (${contact.waId})`);
    }
    
    return contact;
  } catch (error) {
    console.error('❌ Error in findOrCreate contact:', error);
    throw error;
  }
};

// Get active conversations for frontend
contactSchema.statics.getActiveConversations = async function(limit = 50, skip = 0) {
  try {
    return await this.find({
      isActive: true,
      isBlocked: false,
      $or: [
        { lastMessage: { $exists: true, $ne: "" } },
        { 'metadata.totalMessages': { $gt: 0 } }
      ]
    })
    .sort({ lastMessageTime: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
  } catch (error) {
    console.error('❌ Error getting active conversations:', error);
    throw error;
  }
};

// Search contacts by name or phone
contactSchema.statics.searchContacts = async function(query, limit = 20) {
  try {
    const searchRegex = new RegExp(query, 'i');
    
    return await this.find({
      isActive: true,
      isBlocked: false,
      $or: [
        { name: searchRegex },
        { waId: searchRegex },
        { 'metadata.tags': { $in: [searchRegex] } }
      ]
    })
    .sort({ lastMessageTime: -1 })
    .limit(limit)
    .lean();
  } catch (error) {
    console.error('❌ Error searching contacts:', error);
    throw error;
  }
};

// Enhanced instance methods
contactSchema.methods.updateLastMessage = async function(message, timestamp = new Date()) {
  this.lastMessage = message.substring(0, 1000); // Truncate if too long
  this.lastMessageTime = timestamp;
  this.metadata.lastSeen = timestamp;
  this.metadata.lastActivity = timestamp;
  this.metadata.totalMessages = (this.metadata.totalMessages || 0) + 1;
  
  return await this.save();
};

contactSchema.methods.incrementUnreadCount = async function() {
  this.unreadCount = Math.min(this.unreadCount + 1, 9999); // Cap at 9999
  this.metadata.lastActivity = new Date();
  return await this.save();
};

contactSchema.methods.resetUnreadCount = async function() {
  this.unreadCount = 0;
  this.metadata.lastSeen = new Date();
  this.metadata.lastActivity = new Date();
  return await this.save();
};

// Soft delete method
contactSchema.methods.softDelete = async function() {
  this.isActive = false;
  this.metadata.deletedAt = new Date();
  return await this.save();
};

// Block/unblock methods
contactSchema.methods.block = async function(reason = 'manual') {
  this.isBlocked = true;
  this.metadata.blockedAt = new Date();
  this.metadata.blockReason = reason;
  return await this.save();
};

contactSchema.methods.unblock = async function() {
  this.isBlocked = false;
  this.metadata.unblockedAt = new Date();
  delete this.metadata.blockReason;
  return await this.save();
};

// Frontend-compatible format method
contactSchema.methods.toFrontendFormat = function() {
  return {
    _id: this._id,
    waId: this.waId,
    name: this.name,
    profilePic: this.profilePic,
    lastMessage: this.lastMessage || 'No messages yet',
    lastMessageTime: this.lastMessageTime,
    unreadCount: this.unreadCount,
    type: this.lastMessage ? 'conversation' : 'contact',
    status: this.metadata?.isOnline ? 'online' : 'offline',
    isBlocked: this.isBlocked,
    displayName: this.displayName,
    formattedPhone: this.formattedPhone,
    hasUnreadMessages: this.hasUnreadMessages,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Error handling for duplicate keys
contactSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error(`Contact with WhatsApp ID ${doc.waId} already exists`));
  } else {
    next(error);
  }
});

const Contact = mongoose.model('Contact', contactSchema);

export default Contact;
