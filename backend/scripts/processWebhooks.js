import dotenv from 'dotenv';
import connectDatabase from '../src/config/database.js';
import Contact from '../src/models/Contact.js';
import Message from '../src/models/Message.js';

dotenv.config();

const sampleWebhookData = [
  {
    waId: '919937320320',
    name: 'Ravi Kumar',
    messages: [
      { text: 'Hi there! How are you doing?', type: 'incoming', timestamp: new Date(Date.now() - 86400000) },
      { text: 'Can you help me with the project details?', type: 'incoming', timestamp: new Date(Date.now() - 82800000) },
      { text: 'Sure! I\'ll send you the details right away.', type: 'outgoing', timestamp: new Date(Date.now() - 82000000) }
    ]
  },
  {
    waId: '929967673820',
    name: 'Neha Joshi',
    messages: [
      { text: 'Good morning! Ready for today\'s meeting?', type: 'incoming', timestamp: new Date(Date.now() - 7200000) },
      { text: 'Absolutely! See you at 10 AM.', type: 'outgoing', timestamp: new Date(Date.now() - 7000000) },
      { text: 'Great! I\'ve shared the agenda in our group.', type: 'incoming', timestamp: new Date(Date.now() - 6800000) }
    ]
  },
  {
    waId: '918765432109',
    name: 'Tech Support',
    messages: [
      { text: 'Your issue has been resolved. Please check and confirm.', type: 'incoming', timestamp: new Date(Date.now() - 3600000) },
      { text: 'Thank you! Everything is working perfectly now.', type: 'outgoing', timestamp: new Date(Date.now() - 3400000) }
    ]
  }
];

async function processWebhooks(clearExisting = false) {
  try {
    await connectDatabase();
    console.log('🔄 Processing webhook data...');

    if (clearExisting) {
      console.log('🗑️ Clearing existing data...');
      await Message.deleteMany({});
      await Contact.deleteMany({});
      console.log('✅ Existing data cleared');
    }

    for (const webhookData of sampleWebhookData) {
      console.log(`📋 Processing contact: ${webhookData.name} (${webhookData.waId})`);

      const contact = await Contact.findOneAndUpdate(
        { waId: webhookData.waId },
        {
          waId: webhookData.waId,
          name: webhookData.name,
          lastMessage: webhookData.messages[webhookData.messages.length - 1]?.text || '',
          lastMessageTime: webhookData.messages[webhookData.messages.length - 1]?.timestamp || new Date(),
          unreadCount: webhookData.messages.filter(m => m.type === 'incoming').length,
          metadata: {
            phoneNumber: webhookData.waId,
            createdBy: 'webhook',
            source: 'whatsapp-api',
            lastSeen: new Date(),
            isOnline: Math.random() > 0.5
          }
        },
        { upsert: true, new: true }
      );

      console.log(`✅ Contact processed: ${contact.name}`);

      for (const msgData of webhookData.messages) {
        const messageId = `webhook-${webhookData.waId}-${msgData.timestamp.getTime()}`;
        
        const existingMessage = await Message.findOne({ messageId });
        if (!existingMessage) {
          const message = new Message({
            messageId,
            waId: webhookData.waId,
            fromNumber: msgData.type === 'outgoing' ? '918329446654' : webhookData.waId,
            toNumber: msgData.type === 'outgoing' ? webhookData.waId : '918329446654',
            text: msgData.text,
            type: msgData.type,
            status: msgData.type === 'outgoing' ? 'delivered' : 'read',
            timestamp: msgData.timestamp,
            messageType: 'text',
            webhookData: {
              demo_message: true,
              processed_at: new Date(),
              source: 'webhook-processor'
            }
          });

          await message.save();
          console.log(`💬 Message saved: ${msgData.text.substring(0, 30)}...`);
        }
      }
    }

    console.log('🎉 Webhook processing completed successfully!');
    console.log('📊 Summary:');
    
    const totalContacts = await Contact.countDocuments();
    const totalMessages = await Message.countDocuments();
    
    console.log(`   - Total contacts: ${totalContacts}`);
    console.log(`   - Total messages: ${totalMessages}`);

  } catch (error) {
    console.error('❌ Error processing webhooks:', error);
  } finally {
    process.exit(0);
  }
}

const shouldClear = process.argv.includes('--clear');
processWebhooks(shouldClear);
