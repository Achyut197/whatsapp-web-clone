import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  waId: {
    type: String,
    required: true,
    unique: true,  // Keep unique: true
    trim: true
    // ❌ CRITICAL: Remove any "index: true" line here
  },
  name: {
    type: String,
    required: true,
    trim: true
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
    default: ''
  },
  lastMessageTime: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  metadata: {
    phoneNumber: {
      type: String,
      default: function() { return this.waId; }
    },
    country: String,
    tags: [{
      type: String,
      trim: true
    }],
    createdBy: {
      type: String,
      enum: ['webhook', 'manual', 'import'],
      default: 'webhook'
    },
    source: {
      type: String,
      default: 'whatsapp-web-clone'
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    isOnline: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  collection: 'contacts'
});

// ✅ ONLY these explicit index definitions
contactSchema.index({ lastMessageTime: -1 });
contactSchema.index({ 'metadata.createdBy': 1 });
contactSchema.index({ isBlocked: 1 });

// ❌ REMOVE the waId index since unique: true already creates it
// contactSchema.index({ waId: 1 }, { unique: true }); // REMOVE THIS LINE

// Rest of your schema methods...
contactSchema.virtual('displayName').get(function() {
  return this.name || this.waId || 'Unknown Contact';
});

contactSchema.pre('save', function(next) {
  if (this.waId) {
    this.waId = this.waId.replace(/\D/g, '');
  }
  
  if (!this.name && this.waId) {
    this.name = `Contact ${this.waId}`;
  }
  
  if (this.metadata) {
    this.metadata.phoneNumber = this.waId;
  }
  
  next();
});

contactSchema.statics.findOrCreate = async function(contactData) {
  try {
    let contact = await this.findOne({ waId: contactData.waId });
    
    if (!contact) {
      contact = new this(contactData);
      await contact.save();
      console.log(`✅ Created new contact: ${contact.name} (${contact.waId})`);
    } else {
      Object.assign(contact, contactData);
      await contact.save();
      console.log(`🔄 Updated existing contact: ${contact.name} (${contact.waId})`);
    }
    
    return contact;
  } catch (error) {
    console.error('❌ Error in findOrCreate contact:', error);
    throw error;
  }
};

contactSchema.methods.updateLastMessage = async function(message, timestamp = new Date()) {
  this.lastMessage = message;
  this.lastMessageTime = timestamp;
  this.metadata.lastSeen = timestamp;
  return await this.save();
};

contactSchema.methods.incrementUnreadCount = async function() {
  this.unreadCount += 1;
  return await this.save();
};

contactSchema.methods.resetUnreadCount = async function() {
  this.unreadCount = 0;
  return await this.save();
};

const Contact = mongoose.model('Contact', contactSchema);

export default Contact;
