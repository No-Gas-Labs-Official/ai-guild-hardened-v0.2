'use strict';

const { Pool } = require('pg');
const Redis = require('ioredis');
const { loadRuntimeConfig, RuntimeConfigurationError } = require('../runtime-config');

const runtimeConfig = loadRuntimeConfig();

// Client objects do not establish a connection during module import. Queries remain
// impossible in the hardened production baseline because the server is read-only.
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: runtimeConfig.production ? runtimeConfig.dbPort : Number(process.env.DB_PORT || 5432),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: runtimeConfig.production ? runtimeConfig.redisPort : Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
});

const initDatabase = async () => {
  if (runtimeConfig.readOnly) {
    throw new RuntimeConfigurationError('Database initialization is disabled while APP_READ_ONLY is true');
  }
  throw new RuntimeConfigurationError(
    'Database initialization requires a separately reviewed migration workflow; automatic schema creation is disabled.'
  );
};

module.exports = {
  pool,
  redis,
  initDatabase,
};
