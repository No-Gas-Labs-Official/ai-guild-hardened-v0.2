const { initDatabase } = require('./config/database');

// Initialize database and start server
async function start() {
  try {
    console.log('🚀 Initializing No-Gas-Labs™ Ops Intelligence System...');
    
    // Initialize database
    await initDatabase();
    console.log('✅ Database initialized successfully');
    
    // Start server
    require('./server');
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();