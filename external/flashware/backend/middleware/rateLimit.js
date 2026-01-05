const rateLimit = require('express-rate-limit');

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too Many Requests',
    details: 'Rate limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for deployment operations
const deployLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 deployments per windowMs
  message: {
    error: 'Too Many Deploy Requests',
    details: 'Deployment rate limit exceeded. Please wait before deploying again.',
  },
  keyGenerator: (req) => {
    // Use wallet address if available, otherwise IP
    return req.wallet?.address || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for execution operations
const executeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 executions per minute
  message: {
    error: 'Too Many Execute Requests',
    details: 'Execution rate limit exceeded. Please wait before executing again.',
  },
  keyGenerator: (req) => {
    // Use wallet address if available, otherwise IP
    return req.wallet?.address || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for simulation operations
const simulateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // limit each IP to 50 simulations per minute
  message: {
    error: 'Too Many Simulation Requests',
    details: 'Simulation rate limit exceeded. Please wait before simulating again.',
  },
  keyGenerator: (req) => {
    // Use wallet address if available, otherwise IP
    return req.wallet?.address || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for read operations (GET requests)
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 read requests per windowMs
  message: {
    error: 'Too Many Read Requests',
    details: 'Read rate limit exceeded. Please wait before making more requests.',
  },
  skip: (req) => req.method !== 'GET', // Only apply to GET requests
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  deployLimiter,
  executeLimiter,
  simulateLimiter,
  readLimiter,
};