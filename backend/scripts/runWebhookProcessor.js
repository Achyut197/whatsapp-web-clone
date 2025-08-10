import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDatabase from '../src/config/database.js';
import WebhookProcessor from '../src/utils/webhookProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const dir = path.join(__dirname, '../sample-payloads');
  const processor = new WebhookProcessor();
  try {
    console.log('🚀 Connecting to database...');
    await connectDatabase();
    console.log('✅ Connected');

    console.log(`📂 Processing webhook JSON files from: ${dir}`);
    const result = await processor.processJsonFiles(dir);
    console.log('✅ Completed processing:', result);
  } catch (err) {
    console.error('❌ Processing failed:', err);
    process.exit(1);
  } finally {
    setTimeout(() => process.exit(0), 1000);
  }
}

main();


