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
    
    // Enhanced connection options for production stability
    const connectionOptions = {
      // Connection timeout settings
      serverSelectionTimeoutMS: 30000, // Increased for production
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      
      // Network settings
      family: 4, // Use IPv4
      
      // Database name
      dbName: dbName,
      
      // Buffer settings
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false,
      
      // Connection pool settings for production
      maxPoolSize: 10, // Maximum number of connections
      minPoolSize: 2,  // Minimum number of connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      
      // Retry settings
      retryWrites: true,
      retryReads: true,
      
      // Authentication
      authSource: 'admin',
    };

    console.log('⚡ Establishing connection with enhanced options...');
    const conn = await mongoose.connect(mongoURI, connectionOptions);

    console.log('');
    console.log('✅ MongoDB Atlas Connected Successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🏠 Host: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🔗 Connection State: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}`);
    console.log(`🆔 Connection ID: ${conn.connection.id}`);
    console.log(`⚡ Ready State: ${getReadyStateText(mongoose.connection.readyState)}`);
    console.log(`🔢 Port: ${conn.connection.port || 'Default MongoDB Port'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Enhanced connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      console.error('🔧 Error details:', {
        name: err.name,
        message: err.message,
        code: err.code,
        timestamp: new Date().toISOString()
      });
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected at:', new Date().toISOString());
      console.warn('🔄 Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected successfully at:', new Date().toISOString());
    });

    mongoose.connection.on('connecting', () => {
      console.log('🔄 MongoDB connecting...');
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected event triggered');
    });

    // Production health monitoring
    mongoose.connection.on('fullsetup', () => {
      console.log('🎯 MongoDB replica set fully connected');
    });

    mongoose.connection.on('all', () => {
      console.log('🌐 MongoDB all servers connected');
    });

    // Test the connection with a simple operation
    await testDatabaseConnection();
    
    return conn;

  } catch (error) {
    console.error('');
    console.error('❌ Database Connection Failed!');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🚨 Error Message:', error.message);
    console.error('🔍 Error Code:', error.code || 'No code');
    console.error('📅 Timestamp:', new Date().toISOString());
    
    // Enhanced error handling for specific MongoDB errors
    if (error.code === 8000) {
      console.error('🔑 Authentication Error: Check your MongoDB credentials');
    } else if (error.code === 6) {
      console.error('🌐 Network Error: Check your network connection and MongoDB URI');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('🔍 DNS Resolution Error: Cannot resolve MongoDB hostname');
    } else if (error.message.includes('authentication failed')) {
      console.error('🔐 Authentication failed: Invalid username or password');
    }
    
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    
    if (process.env.NODE_ENV === 'production') {
      console.error('💥 Exiting due to database connection failure in production');
      console.error('🔧 Check your MongoDB Atlas cluster status and credentials');
      process.exit(1);
    } else {
      console.warn('⚠️ Continuing without database in development mode');
      console.warn('🔧 Fix the database connection to enable full functionality');
    }
    
    throw error; // Re-throw for proper error handling upstream
  }
};

// Helper function to get readable connection state
const getReadyStateText = (state) => {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };
  return states[state] || 'Unknown';
};

// Test database connection with a simple operation
const testDatabaseConnection = async () => {
  try {
    console.log('🧪 Testing database connection...');
    
    // Perform a simple database operation
    const admin = mongoose.connection.db.admin();
    const result = await admin.ping();
    
    if (result.ok === 1) {
      console.log('✅ Database ping successful - Connection is healthy');
      
      // Get database stats
      const stats = await mongoose.connection.db.stats();
      console.log(`📊 Database Stats: Collections: ${stats.collections}, Objects: ${stats.objects}, Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    }
    
  } catch (error) {
    console.warn('⚠️ Database ping failed:', error.message);
  }
};

// Enhanced graceful shutdown with cleanup
const gracefulShutdown = async (signal) => {
  try {
    console.log(`\n🛑 ${signal} received - Initiating graceful shutdown...`);
    console.log('⏳ Closing MongoDB connection...');
    
    // Close the connection
    await mongoose.connection.close();
    
    console.log('✅ MongoDB connection closed gracefully');
    console.log('👋 Database cleanup completed');
    
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
  } finally {
    console.log('💫 Shutdown process completed');
    process.exit(0);
  }
};

// Enhanced process signal handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart

// Handle uncaught exceptions related to database
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  if (err.message && err.message.includes('mongo')) {
    console.error('🔧 MongoDB-related uncaught exception detected');
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  if (reason && reason.toString().includes('mongo')) {
    console.error('🔧 MongoDB-related unhandled rejection detected');
  }
});

export default connectDatabase;

// Export additional utilities
export { gracefulShutdown, testDatabaseConnection, getReadyStateText };
