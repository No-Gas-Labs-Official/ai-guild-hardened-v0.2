'use strict';

const crypto = require('node:crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { loadRuntimeConfig, publicRuntimeReport, RuntimeConfigurationError } = require('./runtime-config');
const authRoutes = require('./routes/auth');
const { authenticateToken } = require('./routes/auth');

function requestContext(req, res, next) {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}

function safeRequestLogger(req, _res, next) {
  const startedAt = process.hrtime.bigint();
  _res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.info(JSON.stringify({
      event: 'http_request',
      request_id: req.requestId,
      method: req.method,
      path: req.path,
      status: _res.statusCode,
      duration_ms: Math.round(durationMs),
    }));
  });
  next();
}

function readOnlyUnavailable(_req, res) {
  return res.status(503).json({
    error: 'read_only_baseline',
    message: 'Operational API routes are disabled pending explicitly approved infrastructure, data, and security setup.',
  });
}

function createApp({ config = loadRuntimeConfig() } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);

  app.use(requestContext);
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'no-referrer' },
  }));
  if (config.corsOrigins.length > 0) {
    app.use(cors({
      origin: config.corsOrigins,
      credentials: false,
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-ID'],
      maxAge: 600,
    }));
  }
  app.use(compression());
  app.use(safeRequestLogger);
  app.use(express.json({ limit: config.bodyLimitBytes, type: ['application/json', 'application/*+json'] }));
  app.use(express.urlencoded({ extended: false, limit: config.bodyLimitBytes }));

  const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'rate_limit_exceeded' },
  });
  app.use('/api', limiter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'no-gas-labs-ai-guild-platform' });
  });
  app.get('/ready', (_req, res) => {
    res.json(publicRuntimeReport(config));
  });

  // Identity routes must remain first to return their defined safe unavailable state.
  app.use('/api/auth', authRoutes);

  if (config.readOnly) {
    app.use('/api', readOnlyUnavailable);
  } else {
    const protectedApi = express.Router();
    protectedApi.use(authenticateToken);
    protectedApi.use('/repos', require('./routes/repos'));
    protectedApi.use('/architecture', require('./routes/architecture'));
    protectedApi.use('/maintainer', require('./routes/maintainer'));
    protectedApi.use('/registry', require('./routes/registry'));
    protectedApi.use('/prototypes', require('./routes/prototypes'));
    protectedApi.use('/dashboard', require('./routes/dashboard'));
    protectedApi.use('/agents', require('./routes/agents'));
    protectedApi.use('/cli', require('./routes/cli'));
    protectedApi.use('/apk', require('./routes/apk-distribution'));
    protectedApi.use('/notifications', require('./routes/push-notifications'));
    protectedApi.use('/insights', require('./routes/ai-insights'));
    app.use('/api', protectedApi);
  }

  app.use((err, req, res, _next) => {
    const status = err instanceof SyntaxError && 'body' in err ? 400 : 500;
    console.error(JSON.stringify({
      event: 'request_error',
      request_id: req.requestId,
      error_name: err?.name || 'Error',
      status,
    }));
    res.status(status).json({
      error: status === 400 ? 'invalid_request_body' : 'internal_server_error',
      request_id: req.requestId,
    });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'not_found', request_id: req.requestId });
  });

  return app;
}

function startServer() {
  let config;
  try {
    config = loadRuntimeConfig();
  } catch (error) {
    const message = error instanceof RuntimeConfigurationError ? error.message : 'invalid runtime configuration';
    console.error(JSON.stringify({ event: 'startup_rejected', service: 'no-gas-labs-ai-guild-platform', reason: message }));
    process.exitCode = 2;
    return null;
  }
  const app = createApp({ config });
  const server = app.listen(config.port, () => {
    console.info(JSON.stringify({
      event: 'service_started',
      service: 'no-gas-labs-ai-guild-platform',
      port: config.port,
      read_only: config.readOnly,
    }));
  });
  return server;
}

if (require.main === module) startServer();

module.exports = { createApp, startServer, readOnlyUnavailable, requestContext };
