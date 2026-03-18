const { Pool } = require('pg');
const Redis = require('ioredis');

// PostgreSQL configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'nogaslabs_ops',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || null,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

// Database initialization
const initDatabase = async () => {
  try {
    // Create database if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS repositories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        owner VARCHAR(100) NOT NULL,
        description TEXT,
        language VARCHAR(50),
        stars INTEGER DEFAULT 0,
        forks INTEGER DEFAULT 0,
        last_scanned TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS commits (
        id SERIAL PRIMARY KEY,
        repo_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
        commit_hash VARCHAR(40) NOT NULL,
        author VARCHAR(100),
        message TEXT,
        timestamp TIMESTAMP,
        files_changed INTEGER,
        additions INTEGER,
        deletions INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS dependencies (
        id SERIAL PRIMARY KEY,
        repo_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        version VARCHAR(100),
        type VARCHAR(50), -- 'dev', 'peer', 'runtime'
        is_outdated BOOLEAN DEFAULT false,
        latest_version VARCHAR(100),
        security_vulnerability BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS architecture_patterns (
        id SERIAL PRIMARY KEY,
        repo_id INTEGER REFERENCES repositories(id) ON DELETE CASCADE,
        pattern_type VARCHAR(100) NOT NULL,
        pattern_name VARCHAR(255) NOT NULL,
        description TEXT,
        files_affected TEXT[], // array of file paths
        confidence_score FLOAT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_tasks (
        id SERIAL PRIMARY KEY,
        agent_name VARCHAR(100) NOT NULL,
        task_type VARCHAR(100) NOT NULL,
        task_data JSONB,
        status VARCHAR(20) DEFAULT 'pending', // 'pending', 'running', 'completed', 'failed'
        result JSONB,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS prototypes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        project_type VARCHAR(100),
        generated_code JSONB,
        dependencies JSONB,
        test_results JSONB,
        deployment_url VARCHAR(500),
        status VARCHAR(20) DEFAULT 'draft',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS prompts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100),
        version INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS apk_versions (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL,
        build_number VARCHAR(20) DEFAULT '1',
        release_notes TEXT,
        file_path VARCHAR(500),
        file_size BIGINT,
        checksum VARCHAR(64),
        uploaded_by INTEGER REFERENCES users(id),
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_devices (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        device_id VARCHAR(255) NOT NULL,
        fcm_token TEXT NOT NULL,
        device_type VARCHAR(50) DEFAULT 'mobile',
        device_name VARCHAR(100),
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, device_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        data JSONB,
        type VARCHAR(50),
        priority VARCHAR(20) DEFAULT 'normal',
        status VARCHAR(20) DEFAULT 'pending',
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        push_enabled BOOLEAN DEFAULT true,
        email_enabled BOOLEAN DEFAULT false,
        repo_updates BOOLEAN DEFAULT true,
        agent_tasks BOOLEAN DEFAULT true,
        security_alerts BOOLEAN DEFAULT true,
        system_notifications BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );
    `);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

module.exports = {
  pool,
  redis,
  initDatabase
};