import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDatabase = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME || 'whatsapp';
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    console.log('🔄 Connecting to MongoDB Atlas...');
    console.log(`📊 Target Database: ${dbName}`);
    console.log(`🔗 Cluster: whatsapp-web-cluster`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
    console.log(`🎯 Frontend URL: ${process.env.FRONTEND_URL}`);
    
    // ✅ FIXED: Use only supported MongoDB connection options
    const connectionOptions = {
      // Database name
      dbName: dbName,
      
      // Connection timeout settings
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      
      // Connection pool settings
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      
      // Retry settings
      retryWrites: true,
      retryReads: true
    };

    console.log('⚡ Establishing connection with supported options...');
    const conn = await mongoose.connect(mongoURI, connectionOptions);

    console.log('');
    console.log('✅ MongoDB Atlas Connected Successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🏠 Host: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🔗 Connection State: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected at:', new Date().toISOString());
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected successfully at:', new Date().toISOString());
    });

    return conn;

  } catch (error) {
    console.error('');
    console.error('❌ Database Connection Failed!');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🚨 Error Message:', error.message);
    console.error('📅 Timestamp:', new Date().toISOString());
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    
    if (process.env.NODE_ENV === 'production') {
      console.error('💥 Exiting due to database connection failure in production');
      process.exit(1);
    } else {
      console.warn('⚠️ Continuing without database in development mode');
    }
    
    throw error;
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export default connectDatabase;
