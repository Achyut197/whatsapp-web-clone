import dotenv from 'dotenv';
import connectDatabase from '../src/config/database.js';
import Contact from '../src/models/Contact.js';

dotenv.config();

async function fixContactNames() {
  try {
    await connectDatabase();
    console.log('🔧 Fixing contact names...');

    const updates = [
      { waId: '919937320320', name: 'Ravi Kumar' },
      { waId: '929967673820', name: 'Neha Joshi' },
      { waId: '918765432109', name: 'Tech Support' }
    ];

    for (const update of updates) {
      const result = await Contact.findOneAndUpdate(
        { waId: update.waId },
        { 
          name: update.name,
          'metadata.lastSeen': new Date()
        },
        { new: true }
      );

      if (result) {
        console.log(`✅ Updated: ${result.name} (${result.waId})`);
      } else {
        console.log(`⚠️ Contact not found: ${update.waId}`);
      }
    }

    console.log('🎉 Contact names fixed successfully!');
    
    const allContacts = await Contact.find({}).select('waId name lastMessage').lean();
    console.log('📋 Current contacts:');
    allContacts.forEach(contact => {
      console.log(`   - ${contact.name} (${contact.waId}): "${contact.lastMessage}"`);
    });

  } catch (error) {
    console.error('❌ Error fixing contact names:', error);
  } finally {
    process.exit(0);
  }
}

fixContactNames();
