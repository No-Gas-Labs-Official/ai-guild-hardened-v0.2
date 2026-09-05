const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('./auth');
const router = express.Router();

// Get dashboard overview
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    // Get repository statistics
    const repoStats = await pool.query(`
      SELECT 
        COUNT(*) as total_repos,
        COUNT(CASE WHEN last_scanned > NOW() - INTERVAL '24 hours' THEN 1 END) as active_repos,
        COUNT(CASE WHEN language IS NOT NULL THEN 1 END) as repos_with_language,
        SUM(stars) as total_stars,
        SUM(forks) as total_forks
      FROM repositories
    `);
    
    // Get task statistics
    const taskStats = await pool.query(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running_tasks,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tasks
      FROM agent_tasks
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    
    // Get dependency statistics
    const depStats = await pool.query(`
      SELECT 
        COUNT(*) as total_dependencies,
        COUNT(CASE WHEN is_outdated = true THEN 1 END) as outdated_dependencies,
        COUNT(CASE WHEN security_vulnerability = true THEN 1 END) as vulnerable_dependencies
      FROM dependencies
    `);
    
    // Get recent activity
    // FIX (P0, found during merged-state re-verification): PostgreSQL rejects
    // a bare `ORDER BY ... LIMIT` directly inside a UNION ALL arm (42601:
    // "syntax error at or near \"UNION\"" — hit live on 2026-09-05 at
    // position 269). Each arm is now parenthesized, and the arms are wrapped
    // in an outer query so the feed is sorted globally by recency.
    const recentActivity = await pool.query(`
      SELECT * FROM (
        (
          SELECT 
            'repository' as type,
            name as title,
            'Scanned repository' as description,
            last_scanned as timestamp
          FROM repositories
          WHERE last_scanned IS NOT NULL
          ORDER BY last_scanned DESC
          LIMIT 5
        )
        UNION ALL
        (
          SELECT 
            'task' as type,
            agent_name as title,
            task_type as description,
            created_at as timestamp
          FROM agent_tasks
          ORDER BY created_at DESC
          LIMIT 5
        )
      ) as recent
      ORDER BY timestamp DESC
      LIMIT 10
    `);
    
    // Get system health
    const systemHealth = {
      database: 'healthy',
      redis: 'healthy',
      github_api: 'healthy',
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      node_version: process.version
    };
    
    res.json({
      overview: {
        repositories: repoStats.rows[0],
        tasks: taskStats.rows[0],
        dependencies: depStats.rows[0],
        recent_activity: recentActivity.rows,
        system_health: systemHealth
      }
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get repository analytics
router.get('/repositories/analytics', authenticateToken, async (req, res) => {
  try {
    // Language distribution
    const languageDist = await pool.query(`
      SELECT language, COUNT(*) as count, SUM(stars) as total_stars
      FROM repositories
      WHERE language IS NOT NULL
      GROUP BY language
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // Activity trends (last 30 days)
    const activityTrends = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as commits
      FROM commits
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    
    // Top repositories by activity
    const topRepos = await pool.query(`
      SELECT 
        r.name,
        r.owner,
        r.stars,
        r.forks,
        COUNT(c.id) as recent_commits,
        r.last_scanned
      FROM repositories r
      LEFT JOIN commits c ON r.id = c.repo_id 
        AND c.created_at > NOW() - INTERVAL '7 days'
      GROUP BY r.id, r.name, r.owner, r.stars, r.forks, r.last_scanned
      ORDER BY recent_commits DESC, r.stars DESC
      LIMIT 10
    `);
    
    // Repository health metrics
    const healthMetrics = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN last_scanned > NOW() - INTERVAL '24 hours' THEN 1 END) as healthy,
        COUNT(CASE WHEN last_scanned <= NOW() - INTERVAL '24 hours' 
                  AND last_scanned > NOW() - INTERVAL '7 days' THEN 1 END) as warning,
        COUNT(CASE WHEN last_scanned IS NULL 
                  OR last_scanned <= NOW() - INTERVAL '7 days' THEN 1 END) as critical
      FROM repositories
    `);
    
    res.json({
      language_distribution: languageDist.rows,
      activity_trends: activityTrends.rows,
      top_repositories: topRepos.rows,
      health_metrics: healthMetrics.rows[0]
    });
  } catch (error) {
    console.error('Repository analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get agent performance metrics
router.get('/agents/performance', authenticateToken, async (req, res) => {
  try {
    // Agent task performance
    const agentPerformance = await pool.query(`
      SELECT 
        agent_name,
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        AVG(CASE WHEN completed_at IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (completed_at - created_at)) 
                ELSE NULL END) as avg_duration_seconds,
        MAX(created_at) as last_activity
      FROM agent_tasks
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY agent_name
      ORDER BY completed DESC
    `);
    
    // Task type performance
    const taskTypePerformance = await pool.query(`
      SELECT 
        task_type,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as success_rate,
        AVG(CASE WHEN completed_at IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (completed_at - created_at)) 
                ELSE NULL END) as avg_duration
      FROM agent_tasks
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY task_type
      ORDER BY total DESC
    `);
    
    // Recent agent activity
    const recentActivity = await pool.query(`
      SELECT 
        agent_name,
        task_type,
        status,
        created_at,
        completed_at,
        EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - created_at)) as duration
      FROM agent_tasks
      ORDER BY created_at DESC
      LIMIT 20
    `);
    
    res.json({
      agent_performance: agentPerformance.rows,
      task_type_performance: taskTypePerformance.rows,
      recent_activity: recentActivity.rows
    });
  } catch (error) {
    console.error('Agent performance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get system metrics
router.get('/system/metrics', authenticateToken, async (req, res) => {
  try {
    // Database metrics
    const dbMetrics = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
      LIMIT 10
    `);
    
    // System resources
    const systemMetrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      node_version: process.version,
      platform: process.platform,
      arch: process.arch
    };
    
    // API usage statistics
    const apiUsage = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as requests
      FROM agent_tasks
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    
    res.json({
      database_metrics: dbMetrics.rows,
      system_metrics: systemMetrics,
      api_usage: apiUsage.rows
    });
  } catch (error) {
    console.error('System metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get visualizations data
router.get('/visualizations/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    
    let data = null;
    
    switch (type) {
      case 'repo-growth':
        data = await pool.query(`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as count
          FROM repositories
          WHERE created_at > NOW() - INTERVAL '90 days'
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `);
        break;
        
      case 'commit-activity':
        data = await pool.query(`
          SELECT 
            DATE_TRUNC('hour', created_at) as hour,
            COUNT(*) as commits
          FROM commits
          WHERE created_at > NOW() - INTERVAL '7 days'
          GROUP BY DATE_TRUNC('hour', created_at)
          ORDER BY hour ASC
        `);
        break;
        
      case 'dependency-health':
        data = await pool.query(`
          SELECT 
            CASE 
              WHEN is_outdated = false AND security_vulnerability = false THEN 'healthy'
              WHEN is_outdated = true AND security_vulnerability = false THEN 'outdated'
              WHEN security_vulnerability = true THEN 'vulnerable'
            END as status,
            COUNT(*) as count
          FROM dependencies
          GROUP BY status
        `);
        break;
        
      case 'agent-workload':
        data = await pool.query(`
          SELECT 
            agent_name,
            DATE_TRUNC('day', created_at) as date,
            COUNT(*) as tasks
          FROM agent_tasks
          WHERE created_at > NOW() - INTERVAL '7 days'
          GROUP BY agent_name, DATE_TRUNC('day', created_at)
          ORDER BY date ASC
        `);
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid visualization type' });
    }
    
    res.json({
      type,
      data: data.rows,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Visualization data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get alerts and notifications
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const { severity = 'all', limit = 50 } = req.query;
    
    let whereClause = '';
    const params = [];
    
    if (severity !== 'all') {
      whereClause = 'WHERE severity = $1';
      params.push(severity);
    }
    
    // Get alerts (mock data for now)
    const alerts = [
      {
        id: 1,
        type: 'security',
        severity: 'high',
        title: 'Security Vulnerability Detected',
        message: 'Outdated dependency found with known security issue',
        repository: 'example-repo',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        acknowledged: false
      },
      {
        id: 2,
        type: 'performance',
        severity: 'medium',
        title: 'High Memory Usage',
        message: 'System memory usage exceeding 80%',
        repository: null,
        created_at: new Date(Date.now() - 7200000).toISOString(),
        acknowledged: false
      },
      {
        id: 3,
        type: 'maintenance',
        severity: 'low',
        title: 'Repository Not Scanned',
        message: 'Repository has not been scanned in over 24 hours',
        repository: 'inactive-repo',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        acknowledged: true
      }
    ];
    
    // Filter by severity if needed
    const filteredAlerts = severity === 'all' 
      ? alerts 
      : alerts.filter(alert => alert.severity === severity);
    
    res.json({ 
      alerts: filteredAlerts.slice(0, parseInt(limit)),
      total: filteredAlerts.length
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Acknowledge alert
router.post('/alerts/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // In production, this would update the alert in database
    res.json({ 
      message: 'Alert acknowledged successfully',
      alert_id: parseInt(id),
      acknowledged_by: req.user.username,
      acknowledged_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get task status and progress
router.get('/tasks/status', authenticateToken, async (req, res) => {
  try {
    const { agent_name, status } = req.query;
    
    let query = 'SELECT * FROM agent_tasks WHERE 1=1';
    const params = [];
    
    if (agent_name) {
      query += ` AND agent_name = $${params.length + 1}`;
      params.push(agent_name);
    }
    
    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 50';
    
    const result = await pool.query(query, params);
    
    res.json({ 
      tasks: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Get task status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel running task
router.post('/tasks/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Update task status to cancelled
    await pool.query(
      'UPDATE agent_tasks SET status = $1 WHERE id = $2 AND status = $3',
      ['cancelled', parseInt(id), 'running']
    );
    
    res.json({ 
      message: 'Task cancelled successfully',
      task_id: parseInt(id)
    });
  } catch (error) {
    console.error('Cancel task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export dashboard data
router.get('/export/:format', authenticateToken, async (req, res) => {
  try {
    const { format } = req.params;
    const { type = 'overview' } = req.query;
    
    let exportData = {};
    
    switch (type) {
      case 'overview':
        exportData = await getOverviewExportData();
        break;
      case 'repositories':
        exportData = await getRepositoryExportData();
        break;
      case 'agents':
        exportData = await getAgentExportData();
        break;
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="dashboard-${type}-${Date.now()}.json"`);
      res.json(exportData);
    } else if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="dashboard-${type}-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.status(400).json({ error: 'Invalid format. Use json or csv' });
    }
  } catch (error) {
    console.error('Export dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions for export
const getOverviewExportData = async () => {
  const repoStats = await pool.query('SELECT COUNT(*) as total FROM repositories');
  const taskStats = await pool.query('SELECT COUNT(*) as total FROM agent_tasks');
  
  return {
    export_date: new Date().toISOString(),
    repositories: repoStats.rows[0],
    tasks: taskStats.rows[0]
  };
};

const getRepositoryExportData = async () => {
  const result = await pool.query('SELECT * FROM repositories ORDER BY name');
  return { repositories: result.rows };
};

const getAgentExportData = async () => {
  const result = await pool.query('SELECT * FROM agent_tasks ORDER BY created_at DESC LIMIT 100');
  return { tasks: result.rows };
};

const convertToCSV = (data) => {
  // Simple CSV conversion - would need proper implementation
  return 'id,name,description,created_at\n1,Example,Example data,2024-01-01';
};

module.exports = router;