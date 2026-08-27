'use strict';

const { URL } = require('node:url');

class RuntimeConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RuntimeConfigurationError';
  }
}

function parseBoolean(value, { name, defaultValue }) {
  if (value === undefined || value === null || String(value).trim() === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  throw new RuntimeConfigurationError(`${name} must be a boolean value`);
}

function parseBoundedInteger(value, { name, defaultValue, minimum, maximum }) {
  const raw = value === undefined || value === null || String(value).trim() === '' ? defaultValue : value;
  const parsed = Number.parseInt(String(raw), 10);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new RuntimeConfigurationError(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function parseOrigins(value, { required }) {
  const origins = String(value || '').split(',').map((origin) => origin.trim()).filter(Boolean);
  if (required && origins.length === 0) {
    throw new RuntimeConfigurationError('APP_CORS_ORIGINS is required in production');
  }
  for (const origin of origins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch (_) {
      throw new RuntimeConfigurationError('APP_CORS_ORIGINS must contain absolute origins');
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      throw new RuntimeConfigurationError('APP_CORS_ORIGINS must contain bare http(s) origins');
    }
  }
  return origins;
}

function requireStrongSecret(value, name) {
  const secret = String(value || '').trim();
  const weakValues = new Set([
    'password',
    'your-secret-key',
    'your-super-secret-key',
    'nogaslabs-super-secret-key',
    'change-me',
    'replace-me',
  ]);
  if (secret.length < 32 || weakValues.has(secret.toLowerCase())) {
    throw new RuntimeConfigurationError(`${name} must be a non-placeholder value of at least 32 characters in production`);
  }
  return secret;
}

function loadRuntimeConfig(env = process.env) {
  const environment = String(env.NODE_ENV || 'development').trim().toLowerCase() || 'development';
  const production = environment === 'production';
  const port = parseBoundedInteger(env.PORT, {
    name: 'PORT',
    defaultValue: 3000,
    minimum: 1024,
    maximum: 65535,
  });
  const readOnly = parseBoolean(env.APP_READ_ONLY, {
    name: 'APP_READ_ONLY',
    defaultValue: true,
  });
  if (production && !readOnly) {
    throw new RuntimeConfigurationError('APP_READ_ONLY cannot be false in production on this baseline');
  }
  if (production && parseBoolean(env.ENABLE_PUBLIC_UPLOADS, { name: 'ENABLE_PUBLIC_UPLOADS', defaultValue: false })) {
    throw new RuntimeConfigurationError('ENABLE_PUBLIC_UPLOADS cannot be true in production on this baseline');
  }

  const config = {
    environment,
    production,
    port,
    readOnly,
    corsOrigins: parseOrigins(env.APP_CORS_ORIGINS, { required: production }),
    bodyLimitBytes: parseBoundedInteger(env.APP_BODY_LIMIT_BYTES, {
      name: 'APP_BODY_LIMIT_BYTES',
      defaultValue: 1_048_576,
      minimum: 1_024,
      maximum: 10_485_760,
    }),
    rateLimitWindowMs: parseBoundedInteger(env.APP_RATE_LIMIT_WINDOW_MS, {
      name: 'APP_RATE_LIMIT_WINDOW_MS',
      defaultValue: 900_000,
      minimum: 1_000,
      maximum: 86_400_000,
    }),
    rateLimitMax: parseBoundedInteger(env.APP_RATE_LIMIT_MAX, {
      name: 'APP_RATE_LIMIT_MAX',
      defaultValue: 100,
      minimum: 1,
      maximum: 10_000,
    }),
    publicUploadsEnabled: false,
  };

  if (production) {
    config.jwtSecret = requireStrongSecret(env.JWT_SECRET, 'JWT_SECRET');
    for (const key of ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'REDIS_HOST']) {
      if (!String(env[key] || '').trim()) {
        throw new RuntimeConfigurationError(`${key} is required in production`);
      }
    }
    config.dbPort = parseBoundedInteger(env.DB_PORT, {
      name: 'DB_PORT',
      defaultValue: 5432,
      minimum: 1,
      maximum: 65535,
    });
    config.redisPort = parseBoundedInteger(env.REDIS_PORT, {
      name: 'REDIS_PORT',
      defaultValue: 6379,
      minimum: 1,
      maximum: 65535,
    });
  } else {
    config.jwtSecret = String(env.JWT_SECRET || 'development-only-not-for-production-secret').trim();
  }

  return Object.freeze(config);
}

function publicRuntimeReport(config) {
  return {
    status: 'configuration_valid',
    environment: config.environment,
    read_only: config.readOnly,
    public_uploads_enabled: config.publicUploadsEnabled,
    cors_origin_count: config.corsOrigins.length,
    body_limit_bytes: config.bodyLimitBytes,
    capability_boundary: 'platform_runtime_present_but_operational_mutations_disabled',
    external_actions_automatically_enabled: false,
  };
}

module.exports = { RuntimeConfigurationError, loadRuntimeConfig, publicRuntimeReport };
