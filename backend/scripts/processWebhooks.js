import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDatabase from '../src/config/database.js';
import Contact from '../src/models/Contact.js';
import Message, { ProcessedMessage } from '../src/models/Message.js';
import { 
  generateMessageId, 
  formatPhoneNumber, 
  isValidWaId, 
  sanitizeMessageText,
  generateMessagePreview,
  formatTimestamp
} from '../src/utils/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

class EnhancedDataProcessor {
  constructor() {
    this.processedContacts = 0;
    this.processedMessages = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
    
    this.config = {
      businessPhoneNumber: process.env.WHATSAPP_PHONE_NUMBER || '918329446654',
      batchSize: 3,
      delayBetweenBatches: 200
    };
  }

  // ✅ Enhanced sample data with more realistic conversations
  getSampleWebhookData() {
    const now = Date.now();
    
    return [
      {
        waId: '914572187320', // Saroj - matches your logs
        name: 'Saroj Kumar',
        profilePic: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        metadata: {
          designation: 'Business Analyst',
          location: 'Pune, India',
          tags: ['colleague', 'business'],
          priority: 'high'
        },
        messages: [
          { 
            text: 'Hi! How are you doing today? I wanted to discuss the project requirements with you.', 
            type: 'incoming', 
            timestamp: new Date(now - 3600000), // 1 hour ago
            messageType: 'text',
            status: 'delivered'
          },
          { 
            text: 'Hello Saroj! I\'m doing well, thanks for asking. Sure, let\'s discuss the requirements.', 
            type: 'outgoing', 
            timestamp: new Date(now - 3300000), // 55 minutes ago
            messageType: 'text',
            status: 'read'
          },
          { 
            text: 'Great! I\'ve prepared a detailed analysis document. Should I send it over to you now?', 
            type: 'incoming', 
            timestamp: new Date(now - 3000000), // 50 minutes ago
            messageType: 'text',
            status: 'delivered'
          },
          {
            text: 'Absolutely! Please share the document. I\'ll review it and get back to you with feedback.',
            type: 'outgoing',
            timestamp: new Date(now - 2700000), // 45 minutes ago
            messageType: 'text',
            status: 'read'
          },
          {
            text: 'Perfect! I\'ve sent it to your email. Let me know if you have any questions or need clarifications.',
            type: 'incoming',
            timestamp: new Date(now - 1800000), // 30 minutes ago
            messageType: 'text',
            status: 'delivered'
          },
          {
            text: 'Thank you! I\'ll check my email and review the document. Will get back to you soon.',
            type: 'outgoing',
            timestamp: new Date(now - 900000), // 15 minutes ago
            messageType: 'text',
            status: 'read'
          }
        ]
      },
      {
        waId: '919937320320', // Ravi Kumar - existing contact
        name: 'Ravi Kumar',
        profilePic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        metadata: {
          designation: 'Senior Software Engineer',
          location: 'Mumbai, India',
          tags: ['colleague', 'tech'],
          priority: 'high'
        },
        messages: [
          { 
            text: 'Hey! Have you finished the React component refactoring work?', 
            type: 'incoming', 
            timestamp: new Date(now - 7200000), // 2 hours ago
            messageType: 'text',
            status: 'delivered'
          },
          { 
            text: 'Yes! Just completed it. The performance improvements are really significant now.', 
            type: 'outgoing', 
            timestamp: new Date(now - 7000000), // 1.9 hours ago
            messageType: 'text',
            status: 'read'
          },
          { 
            text: 'Awesome! Can you walk me through the changes in tomorrow\'s code review session?', 
            type: 'incoming', 
            timestamp: new Date(now - 6800000), // 1.8 hours ago
            messageType: 'text',
            status: 'delivered'
          },
          {
            text: 'Sure thing! I\'ll prepare a detailed presentation with before/after performance metrics.',
            type: 'outgoing',
            timestamp: new Date(now - 6600000), // 1.7 hours ago
            messageType: 'text',
            status: 'read'
          },
          {
            text: 'Perfect! Looking forward to it. Great work on this optimization project!',
            type: 'incoming',
            timestamp: new Date(now - 6400000), // 1.6 hours ago
            messageType: 'text',
            status: 'delivered'
          }
        ]
      },
      {
        waId: '918765432109',
        name: 'Technical Support Team',
        profilePic: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
        metadata: {
          designation: 'Support Specialist',
          location: 'Bangalore, India',
          tags: ['support', 'technical'],
          priority: 'medium'
        },
        messages: [
          { 
            text: '🔧 Your technical support ticket #TSK-2024-001 has been resolved successfully! Please check your application and confirm if everything is working correctly.', 
            type: 'incoming', 
            timestamp: new Date(now - 1800000), // 30 minutes ago
            messageType: 'text',
            status: 'delivered'
          },
          { 
            text: 'Thank you so much! I just tested it and everything is working perfectly now. Excellent support work!', 
            type: 'outgoing', 
            timestamp: new Date(now - 1600000), // 26 minutes ago
            messageType: 'text',
            status: 'read'
          },
          {
            text: '🎉 We\'re delighted to help! Don\'t hesitate to contact us if you encounter any other technical issues.',
            type: 'incoming',
            timestamp: new Date(now - 1400000), // 23 minutes ago
            messageType: 'text',
            status: 'delivered'
          }
        ]
      },
      {
        waId: '929876543210',
        name: 'Product Manager',
        profilePic: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        metadata: {
          designation: 'Senior Product Manager',
          location: 'Delhi, India',
          tags: ['management', 'product'],
          priority: 'high'
        },
        messages: [
          {
            text: '📊 The Q4 feature roadmap is ready for review. Can we schedule a meeting to discuss it?',
            type: 'incoming',
            timestamp: new Date(now - 1200000), // 20 minutes ago
            messageType: 'text',
            status: 'delivered'
          },
          {
            text: 'Absolutely! How about tomorrow at 2 PM? I\'ll review the roadmap beforehand.',
            type: 'outgoing',
            timestamp: new Date(now - 1000000), // 16 minutes ago
            messageType: 'text',
            status: 'read'
          },
          {
            text: 'Perfect timing! I\'ve sent the calendar invite. Looking forward to our discussion!',
            type: 'incoming',
            timestamp: new Date(now - 600000), // 10 minutes ago
            messageType: 'text',
            status: 'delivered'
          }
        ]
      },
      {
        waId: '917123456789',
        name: 'WhatsApp Demo Assistant',
        profilePic: null,
        metadata: {
          designation: 'Demo Assistant',
          location: 'Virtual',
          tags: ['demo', 'assistant'],
          priority: 'low'
        },
        messages: [
          {
            text: '🤖 Welcome to WhatsApp Web Clone! This is a demonstration of the messaging system with full functionality.',
            type: 'incoming',
            timestamp: new Date(now - 300000), // 5 minutes ago
            messageType: 'text',
            status: 'delivered'
          },
          {
            text: 'Thanks for the demo! The interface looks exactly like the real WhatsApp. Amazing work!',
            type: 'outgoing',
            timestamp: new Date(now - 240000), // 4 minutes ago
            messageType: 'text',
            status: 'read'
          },
          {
            text: '✨ Features include: Real-time messaging, Message status tracking, Contact management, Media support, and Responsive design!',
            type: 'incoming',
            timestamp: new Date(now - 120000), // 2 minutes ago
            messageType: 'text',
            status: 'delivered'
          }
        ]
      }
    ];
  }

  async processWebhooks(clearExisting = false) {
    try {
      console.log('🚀 Enhanced WhatsApp Data Processor - Starting...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Database: ${process.env.DB_NAME || 'whatsapp'}`);
      console.log(`📱 Business Phone: ${this.config.businessPhoneNumber}`);
      console.log(`🌍 Frontend URL: ${process.env.FRONTEND_URL || 'Not configured'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      await connectDatabase();
      console.log('✅ Database connected successfully');

      if (clearExisting) {
        console.log('\n🗑️ Clearing existing demo data...');
        
        const deletionResults = await Promise.all([
          Message.deleteMany({'webhookData.demo_message': true}),
          Contact.deleteMany({'metadata.source': 'whatsapp-web-clone'})
        ]);
        
        console.log(`✅ Cleared ${deletionResults[0].deletedCount} demo messages`);
        console.log(`✅ Cleared ${deletionResults[1].deletedCount} demo contacts`);
      }

      const sampleData = this.getSampleWebhookData();
      console.log(`\n📋 Processing ${sampleData.length} sample conversations...`);

      // Process conversations sequentially
      for (let i = 0; i < sampleData.length; i++) {
        const conversation = sampleData[i];
        console.log(`\n🔄 Processing conversation ${i + 1}/${sampleData.length}: ${conversation.name}`);
        
        await this.processConversation(conversation);
        
        // Delay between conversations
        if (i < sampleData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenBatches));
        }
      }

      await this.displayResults();
      await this.validateData();

      console.log('\n🎉 Data processing completed successfully!');
      console.log('📱 Your frontend should now display all conversations with messages');

    } catch (error) {
      console.error('❌ Error during processing:', error);
      throw error;
    }
  }

  async processConversation(webhookData) {
    const startTime = Date.now();
    
    try {
      const formattedWaId = formatPhoneNumber(webhookData.waId);
      
      if (!isValidWaId(formattedWaId)) {
        throw new Error(`Invalid WhatsApp ID: ${webhookData.waId}`);
      }

      const lastMessage = webhookData.messages[webhookData.messages.length - 1];
      const incomingMessages = webhookData.messages.filter(m => m.type === 'incoming');
      const unreadCount = incomingMessages.filter(m => m.status !== 'read').length;

      // Create/Update contact
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
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            ...webhookData.metadata,
            phoneNumber: formattedWaId,
            createdBy: 'enhanced-processor',
            source: 'whatsapp-web-clone',
            lastSeen: new Date(),
            totalMessages: webhookData.messages.length,
            firstMessageTime: webhookData.messages[0]?.timestamp || new Date(),
            lastActivity: lastMessage?.timestamp || new Date(),
            isOnline: Math.random() > 0.5,
            processingInfo: {
              processedAt: new Date(),
              version: '2.0'
            }
          }
        },
        { 
          upsert: true, 
          new: true, 
          setDefaultsOnInsert: true
        }
      );

      console.log(`✅ Contact processed: ${contact.name} (${webhookData.messages.length} messages)`);
      this.processedContacts++;

      // Process messages
      let messageCount = 0;
      
      for (const [index, msgData] of webhookData.messages.entries()) {
        try {
          const messageId = generateMessageId('enhanced');
          
          // Check if message already exists
          const existingMessage = await Message.findOne({
            waId: formattedWaId,
            text: sanitizeMessageText(msgData.text),
            timestamp: msgData.timestamp
          });

          if (!existingMessage) {
            const message = new Message({
              messageId,
              waId: formattedWaId,
              fromNumber: msgData.type === 'outgoing' ? this.config.businessPhoneNumber : formattedWaId,
              toNumber: msgData.type === 'outgoing' ? formattedWaId : this.config.businessPhoneNumber,
              
              // ✅ CRITICAL: Ensure both text and body are set
              text: sanitizeMessageText(msgData.text),
              body: sanitizeMessageText(msgData.text),
              
              // ✅ CRITICAL: Ensure all frontend compatibility fields
              type: msgData.type,
              direction: msgData.type === 'outgoing' ? 'outbound' : 'inbound',
              fromMe: msgData.type === 'outgoing',
              
              status: msgData.status || (msgData.type === 'outgoing' ? 'delivered' : 'read'),
              timestamp: msgData.timestamp,
              createdAt: msgData.timestamp,
              messageType: msgData.messageType || 'text',
              
              webhookData: {
                demo_message: true,
                processed_at: new Date(),
                source: 'enhanced-processor-v2',
                contact_name: webhookData.name,
                message_index: index,
                frontend_compatible: true
              },
              
              metadata: {
                platform: 'whatsapp-web-clone',
                origin: 'enhanced-processor-v2',
                frontendUrl: process.env.FRONTEND_URL,
                contactName: webhookData.name,
                version: '2.0'
              }
            });

            await message.save();
            try {
              await ProcessedMessage.create({ ...message.toObject(), _id: undefined });
            } catch (dupErr) {
              if (dupErr?.code !== 11000) {
                console.warn('⚠️ processed_messages insert warning:', dupErr.message);
              }
            }
            messageCount++;
            this.processedMessages++;

            console.log(`   💬 Message ${index + 1}/${webhookData.messages.length}: "${generateMessagePreview(msgData.text, 40)}" (${msgData.type})`);
          } else {
            console.log(`   ⏭️ Message ${index + 1} already exists, skipping...`);
          }
        } catch (messageError) {
          console.error(`   ❌ Error processing message ${index + 1}:`, messageError.message);
          this.errorCount++;
        }
      }

      const processingTime = Date.now() - startTime;
      console.log(`📊 Processed ${messageCount} new messages for ${webhookData.name} (${processingTime}ms)`);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Error processing conversation ${webhookData.name} (${processingTime}ms):`, error.message);
      this.errorCount++;
    }
  }

  async displayResults() {
    const totalProcessingTime = Date.now() - this.startTime;
    
    console.log('\n📈 Processing Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Contacts Processed: ${this.processedContacts}`);
    console.log(`💬 Messages Processed: ${this.processedMessages}`);
    console.log(`❌ Errors: ${this.errorCount}`);
    console.log(`⏱️ Total Time: ${totalProcessingTime}ms`);
    console.log(`⚡ Average per contact: ${Math.round(totalProcessingTime / this.processedContacts)}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Get database stats
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

  async validateData() {
    try {
      console.log('\n🔍 Data Validation:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Check message structure
      const sampleMessage = await Message.findOne({
        'webhookData.demo_message': true
      }).lean();
      
      if (sampleMessage) {
        const requiredFields = ['_id', 'body', 'text', 'fromMe', 'timestamp', 'status', 'waId'];
        const missingFields = requiredFields.filter(field => !sampleMessage[field] && sampleMessage[field] !== false);
        
        if (missingFields.length === 0) {
          console.log('✅ Message structure: All required fields present');
        } else {
          console.log(`⚠️ Missing fields: ${missingFields.join(', ')}`);
        }
      }
      
      // Check contact structure
      const sampleContact = await Contact.findOne({
        'metadata.source': 'whatsapp-web-clone'
      }).lean();
      
      if (sampleContact) {
        const requiredContactFields = ['_id', 'waId', 'name', 'lastMessage', 'lastMessageTime'];
        const missingContactFields = requiredContactFields.filter(field => !sampleContact[field]);
        
        if (missingContactFields.length === 0) {
          console.log('✅ Contact structure: All required fields present');
        } else {
          console.log(`⚠️ Missing contact fields: ${missingContactFields.join(', ')}`);
        }
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
    } catch (error) {
      console.error('❌ Error during data validation:', error);
    }
  }
}

// Main execution
async function main() {
  const processor = new EnhancedDataProcessor();
  
  try {
    console.log('🚀 Starting Enhanced WhatsApp Data Population...');
    
    const shouldClear = process.argv.includes('--clear');
    await processor.processWebhooks(shouldClear);
    
    console.log('\n🎉 SUCCESS! Your WhatsApp Web Clone is now populated with comprehensive data');
    console.log('🌐 Open your frontend to see all conversations and messages');
    console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'Configure FRONTEND_URL in .env'}`);
    
  } catch (error) {
    console.error('❌ FAILED: Processing encountered an error:', error);
    process.exit(1);
  } finally {
    console.log('\n👋 Closing database connection...');
    setTimeout(() => process.exit(0), 1000);
  }
}

main();
