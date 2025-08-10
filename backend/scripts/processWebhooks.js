import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDatabase from '../src/config/database.js';
import Contact from '../src/models/Contact.js';
import Message from '../src/models/Message.js';
import { 
  generateMessageId, 
  formatPhoneNumber, 
  isValidWaId, 
  sanitizeMessageText,
  generateMessagePreview,
  formatTimestamp,
  createLogEntry
} from '../src/helpers/helpers.js';

// Handle ES modules __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

class WebhookDataProcessor {
  constructor() {
    this.processedContacts = 0;
    this.processedMessages = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
    
    // Configuration
    this.config = {
      businessPhoneNumber: process.env.WHATSAPP_PHONE_NUMBER || '918329446654',
      batchSize: 5,
      delayBetweenBatches: 500, // ms
      enableDetailedLogging: process.env.NODE_ENV !== 'production'
    };
  }

  // Enhanced sample webhook data with more realistic scenarios
  getSampleWebhookData() {
    const now = Date.now();
    
    return [
      {
        waId: '919937320320',
        name: 'Ravi Kumar',
        profilePic: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        metadata: {
          designation: 'Software Engineer',
          location: 'Mumbai, India',
          tags: ['colleague', 'tech', 'frontend'],
          priority: 'high',
          company: 'Tech Corp'
        },
        messages: [
          { 
            text: 'Hi there! How are you doing today?', 
            type: 'incoming', 
            timestamp: new Date(now - 86400000), // 24 hours ago
            messageType: 'text',
            status: 'delivered'
          },
          { 
            text: 'Can you help me with the React project details?', 
            type: 'incoming', 
            timestamp: new Date(now - 82800000), // 23 hours ago
            messageType: 'text',
            status: 'delivered'
          },
          { 
            text: 'Sure! I\'ll send you the project documentation right away. Let me gather all the files.', 
            type: 'outgoing', 
            timestamp: new Date(now - 82000000), // 22.7 hours ago
            messageType: 'text',
            status: 'read'
          },
          {
            text: 'Thanks! That would be really helpful. I\'m particularly interested in the component architecture.',
            type: 'incoming',
            timestamp: new Date(now - 81600000), // 22.6 hours ago
            messageType: 'text',
            status: 'delivered'
          },
          {
            text: 'Perfect! Check your email for the complete project structure and component documentation.',
            type: 'outgoing',
            timestamp: new Date(now - 81000000), // 22.5 hours ago
            messageType: 'text',
            status: 'read'
          }
        ]
      },
      {
        waId: '929967673820',
        name: 'Neha Joshi',
        profilePic: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        metadata: {
          designation: 'Product Manager',
          location: 'Delhi, India',
          tags: ['colleague', 'management', 'product'],
          priority: 'high',
          company: 'Tech Corp'
        },
        messages: [
          { 
            text: 'Good morning! Ready for today\'s sprint planning meeting?', 
            type: 'incoming', 
            timestamp: new Date(now - 7200000), // 2 hours ago
            messageType: 'text',
            status: 'delivered'
          },
          { 
            text: 'Absolutely! See you at 10 AM in the conference room.', 
            type: 'outgoing', 
            timestamp: new Date(now - 7000000), // 1.9 hours ago
            messageType: 'text',
            status: 'read'
          },
          { 
            text: 'Great! I\'ve shared the sprint agenda and user stories in our Slack channel.', 
            type: 'incoming', 
            timestamp: new Date(now - 6800000), // 1.8 hours ago
            messageType: 'text',
            status: 'delivered'
          },
          {
            text: 'Perfect! I\'ve reviewed the stories. Looks like we have some exciting features to work on.',
            type: 'outgoing',
            timestamp: new Date(now - 6600000), // 1.8 hours ago
            messageType: 'text',
            status: 'read'
          }
        ]
      },
      {
        waId: '918765432109',
        name: 'Tech Support',
        profilePic: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
        metadata: {
          designation: 'Technical Support Specialist',
          location: 'Bangalore, India',
          tags: ['support', 'official', 'technical'],
          priority: 'medium',
          company: 'Support Team'
        },
        messages: [
          { 
            text: 'Your technical issue #TSK-2024-001 has been resolved. Please check your application and confirm if everything is working correctly.', 
            type: 'incoming', 
            timestamp: new Date(now - 3600000), // 1 hour ago
            messageType: 'text',
            status: 'delivered'
          },
          { 
            text: 'Thank you so much! I just tested it and everything is working perfectly now. Great job!', 
            type: 'outgoing', 
            timestamp: new Date(now - 3400000), // 56 minutes ago
            messageType: 'text',
            status: 'read'
          },
          {
            text: 'Excellent! We\'re glad we could help. If you encounter any other issues, please don\'t hesitate to contact us.',
            type: 'incoming',
            timestamp: new Date(now - 3200000), // 53 minutes ago
            messageType: 'text',
            status: 'delivered'
          }
        ]
      },
      {
        waId: '917888999000',
        name: 'Customer Service',
        profilePic: null,
        metadata: {
          designation: 'Customer Support Representative',
          location: 'Online Support',
          tags: ['support', 'customer-service', 'official'],
          priority: 'medium',
          company: 'Customer Care'
        },
        messages: [
          {
            text: 'Hello! Thank you for contacting our customer service. How can we assist you today?',
            type: 'incoming',
            timestamp: new Date(now - 1800000), // 30 minutes ago
            messageType: 'text',
            status: 'delivered'
          },
          {
            text: 'Hi! I have a question about my recent order. Can you help me track its delivery status?',
            type: 'outgoing',
            timestamp: new Date(now - 1700000), // 28 minutes ago
            messageType: 'text',
            status: 'read'
          },
          {
            text: 'Of course! I\'d be happy to help you track your order. Could you please provide your order number?',
            type: 'incoming',
            timestamp: new Date(now - 1600000), // 26 minutes ago
            messageType: 'text',
            status: 'delivered'
          }
        ]
      },
      {
        waId: '919876543210',
        name: 'Demo Contact',
        profilePic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        metadata: {
          designation: 'Demo User',
          location: 'Virtual Environment',
          tags: ['demo', 'testing', 'sample'],
          priority: 'low',
          company: 'Demo Corp'
        },
        messages: [
          {
            text: 'Welcome to WhatsApp Web Clone! This is a demo conversation to showcase the application features.',
            type: 'incoming',
            timestamp: new Date(now - 900000), // 15 minutes ago
            messageType: 'text',
            status: 'delivered'
          },
          {
            text: 'Thanks for the demo! The interface looks amazing and very similar to the original WhatsApp.',
            type: 'outgoing',
            timestamp: new Date(now - 800000), // 13 minutes ago
            messageType: 'text',
            status: 'read'
          },
          {
            text: 'We\'re glad you like it! The app includes features like real-time messaging, contact management, and message status tracking.',
            type: 'incoming',
            timestamp: new Date(now - 600000), // 10 minutes ago
            messageType: 'text',
            status: 'delivered'
          },
          {
            text: 'That\'s impressive! I can see the message status indicators and the responsive design works great.',
            type: 'outgoing',
            timestamp: new Date(now - 300000), // 5 minutes ago
            messageType: 'text',
            status: 'read'
          }
        ]
      }
    ];
  }

  async processWebhooks(clearExisting = false) {
    try {
      console.log('🚀 WhatsApp Webhook Data Processor - Starting...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Database: ${process.env.DB_NAME || 'whatsapp'}`);
      console.log(`📱 Business Phone: ${this.config.businessPhoneNumber}`);
      console.log(`🌍 Frontend URL: ${process.env.FRONTEND_URL || 'Not configured'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      await connectDatabase();
      console.log('✅ Database connected successfully');

      if (clearExisting) {
        console.log('\n🗑️ Clearing existing data...');
        
        const deletionResults = await Promise.all([
          Message.deleteMany({}),
          Contact.deleteMany({})
        ]);
        
        console.log(`✅ Cleared ${deletionResults[0].deletedCount} messages and ${deletionResults[1].deletedCount} contacts`);
      }

      const sampleData = this.getSampleWebhookData();
      console.log(`\n📋 Processing ${sampleData.length} webhook conversations...`);

      // Process in batches to avoid overwhelming the database
      for (let i = 0; i < sampleData.length; i += this.config.batchSize) {
        const batch = sampleData.slice(i, i + this.config.batchSize);
        console.log(`\n🔄 Processing batch ${Math.floor(i / this.config.batchSize) + 1}/${Math.ceil(sampleData.length / this.config.batchSize)}`);
        
        await Promise.all(batch.map(webhookData => this.processConversation(webhookData)));
        
        // Add delay between batches
        if (i + this.config.batchSize < sampleData.length) {
          await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenBatches));
        }
      }

      await this.displayResults();
      await this.showSampleConversations();

      console.log('\n🎉 Webhook processing completed successfully!');

    } catch (error) {
      console.error('❌ Error processing webhooks:', error);
      throw error;
    }
  }

  async processConversation(webhookData) {
    const startTime = Date.now();
    
    try {
      console.log(`\n📞 Processing: ${webhookData.name} (${webhookData.waId})`);

      // Validate and format phone number
      const formattedWaId = formatPhoneNumber(webhookData.waId);
      
      if (!isValidWaId(formattedWaId)) {
        throw new Error(`Invalid WhatsApp ID: ${webhookData.waId}`);
      }

      // Process contact
      const lastMessage = webhookData.messages[webhookData.messages.length - 1];
      const incomingMessages = webhookData.messages.filter(m => m.type === 'incoming');
      const unreadCount = incomingMessages.filter(m => m.status !== 'read').length;

      const contact = await Contact.findOneAndUpdate(
        { waId: formattedWaId },
        {
          waId: formattedWaId,
          name: webhookData.name,
          profilePic: webhookData.profilePic,
          lastMessage: generateMessagePreview(lastMessage?.text || ''),
          lastMessageTime: lastMessage?.timestamp || new Date(),
          unreadCount: unreadCount,
          isActive: true,
          isBlocked: false,
          metadata: {
            ...webhookData.metadata,
            phoneNumber: formattedWaId,
            createdBy: 'webhook-processor',
            source: 'whatsapp-web-clone',
            lastSeen: new Date(),
            totalMessages: webhookData.messages.length,
            firstMessageTime: webhookData.messages[0]?.timestamp || new Date(),
            lastActivity: lastMessage?.timestamp || new Date(),
            isOnline: Math.random() > 0.7, // 30% chance of being online
            processingInfo: {
              processedAt: new Date(),
              processingTime: 0, // Will be updated below
              batchId: `batch_${Date.now()}`
            }
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      console.log(`✅ Contact processed: ${contact.name} (${webhookData.messages.length} messages)`);
      this.processedContacts++;

      // Process messages
      let messageCount = 0;
      for (const [index, msgData] of webhookData.messages.entries()) {
        try {
          const messageId = generateMessageId('webhook');
          
          // Check if message already exists (by content and timestamp)
          const existingMessage = await Message.findOne({
            waId: formattedWaId,
            text: msgData.text,
            timestamp: msgData.timestamp
          });

          if (!existingMessage) {
            const message = new Message({
              messageId,
              waId: formattedWaId,
              fromNumber: msgData.type === 'outgoing' ? this.config.businessPhoneNumber : formattedWaId,
              toNumber: msgData.type === 'outgoing' ? formattedWaId : this.config.businessPhoneNumber,
              text: sanitizeMessageText(msgData.text),
              body: sanitizeMessageText(msgData.text), // Frontend compatibility
              type: msgData.type,
              direction: msgData.type === 'outgoing' ? 'outbound' : 'inbound', // Frontend compatibility
              fromMe: msgData.type === 'outgoing', // Frontend compatibility
              status: msgData.status || (msgData.type === 'outgoing' ? 'delivered' : 'read'),
              timestamp: msgData.timestamp,
              messageType: msgData.messageType || 'text',
              webhookData: {
                demo_message: true,
                processed_at: new Date(),
                source: 'webhook-processor',
                contact_name: webhookData.name,
                message_index: index,
                batch_id: `batch_${Date.now()}`,
                original_data: {
                  waId: webhookData.waId,
                  type: msgData.type,
                  timestamp: msgData.timestamp
                }
              },
              metadata: {
                platform: 'whatsapp-web-clone',
                origin: 'webhook-processor',
                frontendUrl: process.env.FRONTEND_URL,
                processingTime: 0, // Will be updated below
                contactName: webhookData.name
              }
            });

            await message.save();
            messageCount++;
            this.processedMessages++;

            if (this.config.enableDetailedLogging) {
              console.log(`   💬 Message ${index + 1}/${webhookData.messages.length}: "${generateMessagePreview(msgData.text, 30)}" (${msgData.type})`);
            }
          } else {
            if (this.config.enableDetailedLogging) {
              console.log(`   ⏭️ Message ${index + 1} already exists, skipping...`);
            }
          }
        } catch (messageError) {
          console.error(`   ❌ Error processing message ${index + 1}:`, messageError.message);
          this.errorCount++;
        }
      }

      const processingTime = Date.now() - startTime;
      
      // Update contact with processing time
      await Contact.findByIdAndUpdate(contact._id, {
        'metadata.processingInfo.processingTime': processingTime
      });

      console.log(`📊 Processed ${messageCount} new messages for ${webhookData.name} (${processingTime}ms)`);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Error processing conversation ${webhookData.name} (${processingTime}ms):`, error.message);
      this.errorCount++;
    }
  }

  async displayResults() {
    const totalProcessingTime = Date.now() - this.startTime;
    
    console.log('\n📈 Webhook Processing Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Contacts Processed: ${this.processedContacts}`);
    console.log(`💬 Messages Processed: ${this.processedMessages}`);
    console.log(`❌ Errors: ${this.errorCount}`);
    console.log(`⏱️ Total Time: ${totalProcessingTime}ms`);
    console.log(`⚡ Average per contact: ${Math.round(totalProcessingTime / this.processedContacts)}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Get database statistics
    const [totalContacts, totalMessages, activeContacts, recentMessages] = await Promise.all([
      Contact.countDocuments(),
      Message.countDocuments(),
      Contact.countDocuments({ isActive: true }),
      Message.countDocuments({
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);

    console.log('\n📊 Database Statistics:');
    console.log(`   📞 Total Contacts: ${totalContacts} (${activeContacts} active)`);
    console.log(`   💬 Total Messages: ${totalMessages} (${recentMessages} in last 24h)`);
    console.log(`   🌐 Frontend URL: ${process.env.FRONTEND_URL || 'Not configured'}`);
    console.log(`   📱 Business Phone: ${this.config.businessPhoneNumber}`);
  }

  async showSampleConversations() {
    try {
      console.log('\n💬 Sample Conversations:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Get contacts with recent activity
      const activeContacts = await Contact.find({ isActive: true })
        .sort({ lastMessageTime: -1 })
        .limit(3)
        .lean();

      for (const contact of activeContacts) {
        console.log(`\n📱 ${contact.name} (${contact.waId}):`);
        console.log(`   👤 ${contact.metadata?.designation || 'Unknown'} | 📍 ${contact.metadata?.location || 'Unknown'}`);
        console.log(`   📨 ${contact.metadata?.totalMessages || 0} messages | 📬 ${contact.unreadCount} unread`);
        console.log(`   🏷️ ${contact.metadata?.tags?.join(', ') || 'No tags'}`);
        
        // Get recent messages for this contact
        const recentMessages = await Message.find({ waId: contact.waId })
          .sort({ timestamp: -1 })
          .limit(3)
          .lean();

        if (recentMessages.length > 0) {
          console.log('   💭 Recent messages:');
          recentMessages.reverse().forEach((msg, index) => {
            const time = formatTimestamp(msg.timestamp, 'time');
            const direction = msg.type === 'outgoing' ? '→' : '←';
            const preview = generateMessagePreview(msg.text || msg.body, 50);
            const status = msg.status ? `[${msg.status}]` : '';
            
            console.log(`      ${direction} [${time}] ${preview} ${status}`);
          });
        } else {
          console.log('   💭 No messages found');
        }
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
      console.error('❌ Error showing sample conversations:', error);
    }
  }

  async cleanupOldData(daysOld = 30) {
    try {
      console.log(`\n🧹 Cleaning up data older than ${daysOld} days...`);
      
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      const [oldMessages, oldContacts] = await Promise.all([
        Message.deleteMany({ timestamp: { $lt: cutoffDate } }),
        Contact.deleteMany({ 
          lastMessageTime: { $lt: cutoffDate },
          'metadata.tags': { $in: ['demo', 'testing'] }
        })
      ]);

      console.log(`✅ Cleaned up ${oldMessages.deletedCount} old messages and ${oldContacts.deletedCount} old demo contacts`);

    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  getProcessorStats() {
    return {
      processor: 'Webhook Data Processor',
      version: '1.0.0',
      stats: {
        processedContacts: this.processedContacts,
        processedMessages: this.processedMessages,
        errorCount: this.errorCount,
        processingTime: Date.now() - this.startTime,
        startTime: new Date(this.startTime).toISOString()
      },
      config: this.config,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        frontendUrl: process.env.FRONTEND_URL,
        businessPhone: this.config.businessPhoneNumber
      }
    };
  }
}

// Main execution function
async function main() {
  const processor = new WebhookDataProcessor();
  
  try {
    // Check command line arguments
    const shouldClear = process.argv.includes('--clear');
    const shouldCleanup = process.argv.includes('--cleanup');
    
    if (shouldCleanup) {
      await processor.cleanupOldData();
    }
    
    // Process webhook data
    await processor.processWebhooks(shouldClear);
    
    // Show final stats
    const stats = processor.getProcessorStats();
    console.log('\n📊 Final Processing Statistics:');
    console.log(JSON.stringify(stats, null, 2));
    
  } catch (error) {
    console.error('❌ Webhook processing failed:', error);
    process.exit(1);
  } finally {
    console.log('\n👋 Closing database connection...');
    process.exit(0);
  }
}

// Execute the script
main();
