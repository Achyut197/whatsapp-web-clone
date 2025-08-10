import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDatabase from '../src/config/database.js';
import Contact from '../src/models/Contact.js';
import Message from '../src/models/Message.js';
import { formatPhoneNumber, isValidWaId, generateMessagePreview } from '../src/helpers/helpers.js';

// Handle ES modules __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

class ContactManager {
  constructor() {
    this.processedCount = 0;
    this.errorCount = 0;
    this.createdCount = 0;
    this.updatedCount = 0;
    this.startTime = Date.now();
  }

  async fixContactNames() {
    try {
      console.log('🚀 WhatsApp Contact Manager - Starting...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Database: ${process.env.DB_NAME || 'whatsapp'}`);
      console.log(`📱 Frontend: ${process.env.FRONTEND_URL || 'Not configured'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      await connectDatabase();
      console.log('✅ Database connected successfully');

      // Enhanced contact data with more comprehensive information
      const contactUpdates = [
        {
          waId: '919937320320',
          name: 'Ravi Kumar',
          profilePic: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          metadata: {
            designation: 'Software Engineer',
            location: 'Mumbai, India',
            tags: ['colleague', 'tech'],
            priority: 'high'
          }
        },
        {
          waId: '929967673820',
          name: 'Neha Joshi',
          profilePic: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
          metadata: {
            designation: 'Product Manager',
            location: 'Delhi, India',
            tags: ['colleague', 'management'],
            priority: 'high'
          }
        },
        {
          waId: '918765432109',
          name: 'Tech Support',
          profilePic: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
          metadata: {
            designation: 'Technical Support',
            location: 'Bangalore, India',
            tags: ['support', 'official'],
            priority: 'medium'
          }
        },
        {
          waId: '917888999000',
          name: 'Customer Service',
          profilePic: null,
          metadata: {
            designation: 'Customer Support',
            location: 'Online',
            tags: ['support', 'customer-service'],
            priority: 'medium'
          }
        },
        {
          waId: '919876543210',
          name: 'Demo Contact',
          profilePic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
          metadata: {
            designation: 'Demo User',
            location: 'Virtual',
            tags: ['demo', 'testing'],
            priority: 'low'
          }
        }
      ];

      console.log(`\n🔧 Processing ${contactUpdates.length} contact updates...`);

      // Process each contact update
      for (const [index, contactData] of contactUpdates.entries()) {
        try {
          console.log(`\n📞 Processing contact ${index + 1}/${contactUpdates.length}: ${contactData.name}`);
          
          const result = await this.updateContact(contactData);
          
          if (result.created) {
            this.createdCount++;
            console.log(`✅ Created: ${result.contact.name} (${result.contact.waId})`);
          } else {
            this.updatedCount++;
            console.log(`🔄 Updated: ${result.contact.name} (${result.contact.waId})`);
          }
          
          this.processedCount++;
          
          // Add a small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          this.errorCount++;
          console.error(`❌ Error processing ${contactData.name} (${contactData.waId}):`, error.message);
        }
      }

      // Update contact message statistics
      await this.updateContactStatistics();
      
      // Display results
      await this.displayResults();
      
      // Show sample conversations
      await this.showSampleConversations();
      
      console.log('\n🎉 Contact management completed successfully!');

    } catch (error) {
      console.error('❌ Error in contact management:', error);
      throw error;
    }
  }

  async updateContact(contactData) {
    try {
      // Validate and format phone number
      const formattedWaId = formatPhoneNumber(contactData.waId);
      
      if (!isValidWaId(formattedWaId)) {
        throw new Error(`Invalid WhatsApp ID: ${contactData.waId}`);
      }

      // Check if contact exists
      const existingContact = await Contact.findOne({ waId: formattedWaId });
      const isNewContact = !existingContact;

      // Prepare update data
      const updateData = {
        waId: formattedWaId,
        name: contactData.name,
        profilePic: contactData.profilePic,
        isActive: true,
        isBlocked: false,
        metadata: {
          ...contactData.metadata,
          phoneNumber: formattedWaId,
          source: 'manual-fix',
          lastUpdated: new Date(),
          updatedBy: 'contact-manager-script'
        }
      };

      // If it's a new contact, add creation metadata
      if (isNewContact) {
        updateData.unreadCount = 0;
        updateData.lastMessage = '';
        updateData.lastMessageTime = new Date();
        updateData.metadata.createdAt = new Date();
        updateData.metadata.createdBy = 'contact-manager-script';
      }

      // Update or create contact
      const contact = await Contact.findOneAndUpdate(
        { waId: formattedWaId },
        updateData,
        { 
          new: true, 
          upsert: true,
          setDefaultsOnInsert: true
        }
      );

      return {
        contact,
        created: isNewContact
      };

    } catch (error) {
      console.error(`Error updating contact ${contactData.name}:`, error.message);
      throw error;
    }
  }

  async updateContactStatistics() {
    try {
      console.log('\n📊 Updating contact statistics...');
      
      const contacts = await Contact.find({ isActive: true });
      let statisticsUpdated = 0;

      for (const contact of contacts) {
        try {
          // Get message statistics for this contact
          const messageStats = await this.getContactMessageStats(contact.waId);
          
          // Update contact with fresh statistics
          await Contact.findByIdAndUpdate(contact._id, {
            lastMessage: messageStats.lastMessage,
            lastMessageTime: messageStats.lastMessageTime,
            unreadCount: messageStats.unreadCount,
            'metadata.totalMessages': messageStats.totalMessages,
            'metadata.lastActivity': messageStats.lastActivity,
            'metadata.firstMessageTime': messageStats.firstMessageTime,
            'metadata.lastSeen': new Date()
          });

          statisticsUpdated++;
          
        } catch (error) {
          console.warn(`⚠️ Failed to update stats for ${contact.name}:`, error.message);
        }
      }

      console.log(`✅ Updated statistics for ${statisticsUpdated} contacts`);

    } catch (error) {
      console.error('❌ Error updating contact statistics:', error);
    }
  }

  async getContactMessageStats(waId) {
    try {
      // Get all messages for this contact
      const messages = await Message.find({ waId })
        .sort({ timestamp: -1 })
        .lean();

      if (messages.length === 0) {
        return {
          lastMessage: '',
          lastMessageTime: new Date(),
          unreadCount: 0,
          totalMessages: 0,
          lastActivity: new Date(),
          firstMessageTime: new Date()
        };
      }

      // Get the latest message
      const lastMessage = messages[0];
      const firstMessage = messages[messages.length - 1];

      // Count unread incoming messages
      const unreadCount = messages.filter(msg => 
        msg.type === 'incoming' && msg.status !== 'read'
      ).length;

      return {
        lastMessage: generateMessagePreview(lastMessage.text || lastMessage.body),
        lastMessageTime: lastMessage.timestamp || lastMessage.createdAt,
        unreadCount: unreadCount,
        totalMessages: messages.length,
        lastActivity: lastMessage.timestamp || lastMessage.createdAt,
        firstMessageTime: firstMessage.timestamp || firstMessage.createdAt
      };

    } catch (error) {
      console.warn(`Warning: Could not get message stats for ${waId}:`, error.message);
      return {
        lastMessage: '',
        lastMessageTime: new Date(),
        unreadCount: 0,
        totalMessages: 0,
        lastActivity: new Date(),
        firstMessageTime: new Date()
      };
    }
  }

  async displayResults() {
    const processingTime = Date.now() - this.startTime;
    
    console.log('\n📈 Contact Management Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Total Processed: ${this.processedCount}`);
    console.log(`🆕 Created: ${this.createdCount}`);
    console.log(`🔄 Updated: ${this.updatedCount}`);
    console.log(`❌ Errors: ${this.errorCount}`);
    console.log(`⏱️ Processing Time: ${processingTime}ms`);
    console.log(`⚡ Average per contact: ${Math.round(processingTime / this.processedCount)}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Get updated contact list
    const allContacts = await Contact.find({ isActive: true })
      .select('waId name lastMessage lastMessageTime unreadCount metadata')
      .sort({ lastMessageTime: -1 })
      .lean();

    console.log(`\n👥 All Contacts (${allContacts.length} total):`);
    
    allContacts.forEach((contact, index) => {
      const lastMsg = contact.lastMessage ? 
        contact.lastMessage.substring(0, 40) + (contact.lastMessage.length > 40 ? '...' : '') : 
        'No messages';
      
      const designation = contact.metadata?.designation || 'Unknown';
      const totalMessages = contact.metadata?.totalMessages || 0;
      
      console.log(`   ${index + 1}. ${contact.name} (${contact.waId})`);
      console.log(`      👤 ${designation} | 📨 ${totalMessages} msgs | 📬 ${contact.unreadCount} unread`);
      console.log(`      💬 "${lastMsg}"`);
      console.log('');
    });
  }

  async showSampleConversations() {
    try {
      console.log('\n💬 Sample Conversations:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Get contacts with messages
      const contactsWithMessages = await Contact.find({
        isActive: true,
        'metadata.totalMessages': { $gt: 0 }
      })
      .sort({ lastMessageTime: -1 })
      .limit(5)
      .lean();

      for (const contact of contactsWithMessages) {
        console.log(`\n📱 ${contact.name} (${contact.waId}):`);
        
        // Get recent messages for this contact
        const recentMessages = await Message.find({ waId: contact.waId })
          .sort({ timestamp: -1 })
          .limit(3)
          .lean();

        if (recentMessages.length > 0) {
          recentMessages.reverse().forEach((msg, index) => {
            const time = new Date(msg.timestamp).toLocaleTimeString([], 
              { hour: '2-digit', minute: '2-digit' });
            const direction = msg.type === 'outgoing' ? '→' : '←';
            const preview = generateMessagePreview(msg.text || msg.body, 60);
            
            console.log(`   ${direction} [${time}] ${preview} (${msg.status})`);
          });
        } else {
          console.log('   No messages found');
        }
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
      console.error('❌ Error showing sample conversations:', error);
    }
  }

  async cleanupDuplicateContacts() {
    try {
      console.log('\n🧹 Cleaning up duplicate contacts...');
      
      const duplicates = await Contact.aggregate([
        { $group: { _id: '$waId', count: { $sum: 1 }, docs: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } }
      ]);

      if (duplicates.length === 0) {
        console.log('✅ No duplicate contacts found');
        return;
      }

      let removedCount = 0;
      
      for (const duplicate of duplicates) {
        // Keep the first document, remove the rest
        const toRemove = duplicate.docs.slice(1);
        
        await Contact.deleteMany({ _id: { $in: toRemove } });
        removedCount += toRemove.length;
        
        console.log(`🗑️ Removed ${toRemove.length} duplicates for waId: ${duplicate._id}`);
      }

      console.log(`✅ Cleanup completed: ${removedCount} duplicate contacts removed`);

    } catch (error) {
      console.error('❌ Error cleaning up duplicates:', error);
    }
  }

  async validateContacts() {
    try {
      console.log('\n🔍 Validating contacts...');
      
      const contacts = await Contact.find({});
      const issues = [];

      for (const contact of contacts) {
        // Check for invalid waId
        if (!isValidWaId(contact.waId)) {
          issues.push({
            type: 'invalid_wa_id',
            contact: contact.name,
            waId: contact.waId,
            issue: 'Invalid WhatsApp ID format'
          });
        }

        // Check for missing name
        if (!contact.name || contact.name.trim() === '') {
          issues.push({
            type: 'missing_name',
            contact: contact.waId,
            waId: contact.waId,
            issue: 'Missing contact name'
          });
        }

        // Check for very old lastMessageTime
        const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        if (contact.lastMessageTime < oneYearAgo) {
          issues.push({
            type: 'old_activity',
            contact: contact.name,
            waId: contact.waId,
            issue: 'Very old last message time'
          });
        }
      }

      if (issues.length === 0) {
        console.log('✅ All contacts are valid');
      } else {
        console.log(`⚠️ Found ${issues.length} issues:`);
        issues.forEach((issue, index) => {
          console.log(`   ${index + 1}. ${issue.type}: ${issue.contact} - ${issue.issue}`);
        });
      }

      return issues;

    } catch (error) {
      console.error('❌ Error validating contacts:', error);
      return [];
    }
  }
}

// Main execution function
async function main() {
  const manager = new ContactManager();
  
  try {
    // Fix contact names and update information
    await manager.fixContactNames();
    
    // Clean up duplicates
    await manager.cleanupDuplicateContacts();
    
    // Validate contacts
    await manager.validateContacts();
    
    console.log('\n🎯 All contact management tasks completed successfully!');
    
  } catch (error) {
    console.error('❌ Contact management failed:', error);
    process.exit(1);
  } finally {
    console.log('\n👋 Closing database connection...');
    process.exit(0);
  }
}

// Execute the script
main();
