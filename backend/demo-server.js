const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Demo authentication endpoints
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Demo login - accept any credentials
  if (username && password) {
    res.json({
      message: 'Login successful',
      user: { 
        id: 1, 
        username: username || 'admin', 
        email: `${username}@nogaslabs.com`, 
        role: 'admin' 
      },
      token: 'demo-jwt-token-' + Date.now()
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/auth/me', (req, res) => {
  res.json({ 
    user: { 
      id: 1, 
      username: 'admin', 
      email: 'admin@nogaslabs.com', 
      role: 'admin' 
    } 
  });
});

// Demo repositories endpoint
app.get('/api/repos', (req, res) => {
  res.json({
    repositories: [
      {
        id: 1,
        name: 'example-repo',
        owner: 'nogaslabs',
        url: 'https://github.com/nogaslabs/example-repo',
        description: 'Example repository for demonstration',
        language: 'JavaScript',
        stars: 42,
        forks: 12,
        last_scanned: new Date().toISOString()
      }
    ]
  });
});

// Demo dashboard endpoint
app.get('/api/dashboard/overview', (req, res) => {
  res.json({
    overview: {
      repositories: { total_repos: 1, active_repos: 1, total_stars: 42, total_forks: 12 },
      tasks: { total_tasks: 5, completed_tasks: 4, running_tasks: 1, failed_tasks: 0 },
      dependencies: { total_dependencies: 25, outdated_dependencies: 3, vulnerable_dependencies: 0 },
      recent_activity: [
        { type: 'repository', title: 'example-repo', description: 'Repository scanned successfully', timestamp: new Date().toISOString() }
      ]
    }
  });
});

// Demo agents endpoint
app.get('/api/agents', (req, res) => {
  res.json({
    agents: [
      {
        id: 'prometheus',
        name: 'Prometheus',
        description: 'Security and monitoring specialist',
        status: 'idle',
        recent_stats: { completed: 12, running: 0 }
      },
      {
        id: 'ninja',
        name: 'Ninja',
        description: 'Full-stack development and automation',
        status: 'running',
        recent_stats: { completed: 8, running: 1 }
      }
    ]
  });
});

// Demo CLI commands endpoint
app.get('/api/cli/commands', (req, res) => {
  res.json({
    commands: [
      { name: 'scan', description: 'Scan and analyze a GitHub repository' },
      { name: 'map', description: 'Generate architecture maps and visualizations' },
      { name: 'init-project', description: 'Initialize a new project prototype' }
    ]
  });
});

// Demo CLI execute endpoint
app.post('/api/cli/execute', (req, res) => {
  const { command } = req.body;
  
  setTimeout(() => {
    res.json({
      command,
      result: {
        status: 'success',
        message: `Command "${command}" executed successfully`,
        timestamp: new Date().toISOString()
      },
      executed_at: new Date().toISOString()
    });
  }, 1000);
});

// APK Distribution endpoints
app.get('/api/apk/latest', (req, res) => {
  res.json({
    hasUpdate: true,
    version: {
      id: 1,
      version: '1.0.0',
      build_number: '1',
      release_notes: 'Initial release with all 9 modules',
      created_at: new Date().toISOString()
    },
    downloadUrl: '/api/apk/download/1',
    releaseNotes: 'Initial release with all 9 modules',
    updateRequired: true
  });
});

app.post('/api/apk/check-updates', (req, res) => {
  const { currentVersion } = req.body;
  res.json({
    hasUpdate: currentVersion !== '1.0.0',
    currentVersion,
    latestVersion: '1.0.0',
    downloadUrl: '/api/apk/download/1',
    releaseNotes: 'Initial release with all 9 modules',
    updateRequired: currentVersion !== '1.0.0',
    forceUpdate: false
  });
});

app.get('/api/apk/download/:versionId', (req, res) => {
  res.json({
    message: 'APK download ready',
    downloadUrl: 'https://example.com/download/nogaslabs-ops-1.0.0.apk',
    size: '15.2 MB',
    checksum: 'sha256:abc123...'
  });
});

app.get('/api/apk/history', (req, res) => {
  res.json({
    versions: [
      {
        id: 1,
        version: '1.0.0',
        build_number: '1',
        release_notes: 'Initial release with all 9 modules',
        created_at: new Date().toISOString()
      }
    ],
    total: 1
  });
});

// Push Notifications endpoints
app.post('/api/notifications/register-device', (req, res) => {
  res.status(201).json({
    message: 'Device registered successfully',
    device: {
      id: 1,
      user_id: 1,
      device_id: req.body.deviceId || 'demo-device',
      device_type: 'mobile',
      is_active: true
    }
  });
});

app.get('/api/notifications', (req, res) => {
  res.json({
    notifications: [
      {
        id: 1,
        title: 'Repository Scan Completed',
        body: 'example-repo has been scanned successfully',
        type: 'repo_update',
        created_at: new Date().toISOString(),
        read_at: null
      },
      {
        id: 2,
        title: 'Agent Task Failed',
        body: 'Ninja agent failed to complete task',
        type: 'agent_error',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        read_at: null
      }
    ],
    unreadCount: 2,
    total: 2
  });
});

app.get('/api/notifications/settings', (req, res) => {
  res.json({
    settings: {
      push_enabled: true,
      email_enabled: false,
      repo_updates: true,
      agent_tasks: true,
      security_alerts: true,
      system_notifications: true
    }
  });
});

// AI Insights endpoints
app.get('/api/insights/dashboard', (req, res) => {
  res.json({
    insights: {
      summary: {
        repositories: {
          total: 5,
          active: 4,
          activityRate: '80.0',
          totalStars: 150,
          totalForks: 30
        },
        prometheus: {
          totalTasks: 12,
          successRate: '95.0',
          avgDuration: '45.2'
        },
        ninja: {
          totalTasks: 8,
          successRate: '87.5',
          avgDuration: '120.5'
        },
        grok: {
          totalTasks: 6,
          successRate: '100.0',
          avgDuration: '30.0'
        }
      },
      trends: [
        {
          type: 'activity',
          metric: 'Daily Commits',
          current: '15.0',
          previous: '12.0',
          trend: 'increasing',
          percentage: 25.0
        }
      ],
      anomalies: [
        {
          type: 'performance',
          severity: 'medium',
          agent: 'ninja',
          message: 'ninja average task duration is 2.0 minutes',
          recommendation: 'Optimize task execution'
        }
      ],
      recommendations: [
        {
          type: 'maintenance',
          priority: 'medium',
          title: 'One repository needs attention',
          description: '20% of repositories haven\'t been scanned recently',
          action: 'Schedule regular scans'
        }
      ],
      score: 85
    },
    generated_at: new Date().toISOString()
  });
});

app.get('/api/insights/mobile-metrics', (req, res) => {
  res.json({
    metrics: {
      health: {
        repositories: {
          total: 5,
          healthy: 4,
          issues: 1,
          healthPercentage: '80.0'
        },
        agents: {
          total: 3,
          healthy: 2,
          issues: 1,
          healthPercentage: '66.7'
        }
      },
      performance: {
        avgResponseTime: '1.25',
        totalRequests: 26,
        trend: 'stable'
      },
      timestamp: new Date().toISOString()
    },
    generated_at: new Date().toISOString()
  });
});

app.get('/api/insights/anomalies', (req, res) => {
  res.json({
    anomalies: [
      {
        type: 'performance',
        severity: 'medium',
        agent: 'ninja',
        message: 'ninja average task duration is 2.0 minutes',
        recommendation: 'Optimize task execution'
      }
    ],
    total_anomalies: 1,
    critical_anomalies: 0,
    generated_at: new Date().toISOString()
  });
});

app.get('/api/insights/recommendations', (req, res) => {
  res.json({
    recommendations: [
      {
        type: 'maintenance',
        priority: 'medium',
        title: 'One repository needs attention',
        description: '20% of repositories haven\'t been scanned recently',
        action: 'Schedule regular scans'
      }
    ],
    total_recommendations: 1,
    high_priority: 0,
    generated_at: new Date().toISOString()
  });
});

app.get('/api/insights/health-score', (req, res) => {
  res.json({
    score: 85,
    category: 'good',
    status: 'healthy',
    factors: {
      anomalies: 1,
      recommendations: 1,
      activityRate: '80.0'
    },
    generated_at: new Date().toISOString()
  });
});

// Catch all other routes
app.use((req, res) => {
  res.status(404).json({ error: 'Demo endpoint not available' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 No-Gas-Labs™ Ops Intelligence Demo Server running on port ${PORT}`);
  console.log(`📱 Mobile-ready backend for demonstration`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API available at: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;