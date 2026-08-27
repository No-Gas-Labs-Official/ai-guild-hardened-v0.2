'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { loadRuntimeConfig } = require('../runtime-config');

const router = express.Router();
const JWT_ISSUER = 'no-gas-labs-ai-guild';
const JWT_AUDIENCE = 'no-gas-labs-ai-guild-api';

function getConfig() {
  return loadRuntimeConfig();
}

function getBearerToken(headerValue) {
  if (typeof headerValue !== 'string') return null;
  const match = /^Bearer\s+([A-Za-z0-9._-]+)$/.exec(headerValue.trim());
  return match ? match[1] : null;
}

function authenticateToken(req, res, next) {
  const token = getBearerToken(req.headers.authorization);
  if (!token) return res.status(401).json({ error: 'access_token_required' });
  try {
    const config = getConfig();
    req.user = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return next();
  } catch (_) {
    return res.status(403).json({ error: 'invalid_or_expired_token' });
  }
}

function readOnlyUnavailable(_req, res) {
  return res.status(503).json({
    error: 'read_only_baseline',
    message: 'Identity and data mutation endpoints are disabled pending approved database and operations setup.',
  });
}

function validateCredentials(username, email, password) {
  if (typeof username !== 'string' || !/^[A-Za-z0-9_.-]{3,50}$/.test(username)) return false;
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  return typeof password === 'string' && password.length >= 12 && password.length <= 256;
}

function signToken(user, config) {
  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    config.jwtSecret,
    { algorithm: 'HS256', expiresIn: '15m', issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
  );
}

router.post('/register', readOnlyUnavailable);
router.post('/login', readOnlyUnavailable);

router.get('/me', authenticateToken, (req, res) => {
  if (getConfig().readOnly) return readOnlyUnavailable(req, res);
  return res.status(501).json({ error: 'identity_backend_not_enabled' });
});

router.post('/refresh', authenticateToken, (req, res) => {
  if (getConfig().readOnly) return readOnlyUnavailable(req, res);
  try {
    return res.json({ token: signToken(req.user, getConfig()) });
  } catch (_) {
    return res.status(500).json({ error: 'token_refresh_failed' });
  }
});

// Exported for offline unit tests and for future reviewed routes. Registration and
// login remain deliberately unavailable until a database lifecycle is approved.
module.exports = router;
module.exports.authenticateToken = authenticateToken;
module.exports.validateCredentials = validateCredentials;
module.exports.getBearerToken = getBearerToken;
module.exports.signToken = signToken;
