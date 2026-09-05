const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100 // limit each IP to 100 requests per windowMs ('max' is deprecated in express-rate-limit v7+)
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/repos', require('./routes/repos'));
app.use('/api/architecture', require('./routes/architecture'));
app.use('/api/maintainer', require('./routes/maintainer'));
app.use('/api/registry', require('./routes/registry'));
app.use('/api/prototypes', require('./routes/prototypes'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/cli', require('./routes/cli'));
app.use('/api/apk', require('./routes/apk-distribution'));
app.use('/api/notifications', require('./routes/push-notifications'));
app.use('/api/insights', require('./routes/ai-insights'));

// System routers — previously implemented but never mounted (unreachable dead code).
// The frontend QuadrupleExposure UI depends on /api/quadruple; liver, ip-moat and
// rituals expose the autonomous-liver, IP moat and zero-gas ritual subsystems.
app.use('/api/quadruple', require('./routes/quadruple'));
app.use('/api/liver', require('./routes/autonomous-liver'));
app.use('/api/ip-moat', require('./routes/ip-moat'));
app.use('/api/rituals', require('./routes/zero-gas-rituals').router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
// NOTE: Express 5 removed support for bare '*' paths — app.use('*') throws
// "Missing parameter name at index 1: *" at startup. A pathless middleware
// matches everything that fell through, which is what we want here.
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 No-Gas-Labs™ Ops Intelligence Server running on port ${PORT}`);
  console.log(`📱 Mobile-optimized backend ready`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;