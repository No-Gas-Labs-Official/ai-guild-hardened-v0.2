const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('./auth');
const router = express.Router();

// AI Analytics Engine for generating insights
class AIInsightsEngine {
  // Analyze repository activity and generate insights
  static async analyzeRepositoryInsights(userId) {
    try {
      // Get repository data
      const reposResult = await pool.query(
        `SELECT 
           COUNT(*) as total_repos,
           COUNT(CASE WHEN last_scanned > NOW() - INTERVAL '7 days' THEN 1 END) as active_repos,
           SUM(stars) as total_stars,
           SUM(forks) as total_forks
         FROM repositories`
      );

      // Get commit activity trends
      const activityResult = await pool.query(
        `SELECT 
           DATE(created_at) as date,
           COUNT(*) as commits
         FROM commits
         WHERE created_at > NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at)
         ORDER BY date ASC`
      );

      // Get agent performance
      const agentResult = await pool.query(
        `SELECT 
           agent_name,
           COUNT(*) as total_tasks,
           COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
           AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration
         FROM agent_tasks
         WHERE created_at > NOW() - INTERVAL '7 days'
         GROUP BY agent_name`
      );

      // Generate insights
      const insights = this.generateInsights({
        repositories: reposResult.rows[0],
        activity: activityResult.rows,
        agents: agentResult.rows
      });

      return insights;
    } catch (error) {
      console.error('Repository insights analysis error:', error);
      throw error;
    }
  }

  // Generate AI-powered insights from data
  static generateInsights(data) {
    const insights = {
      summary: {},
      trends: [],
      anomalies: [],
      recommendations: [],
      score: 0
    };

    // Repository summary
    const repos = data.repositories;
    insights.summary.repositories = {
      total: repos.total_repos,
      active: repos.active_repos,
      activityRate: repos.total_repos > 0 ? (repos.active_repos / repos.total_repos * 100).toFixed(1) : 0,
      totalStars: repos.total_stars,
      totalForks: repos.total_forks
    };

    // Activity trends
    const activity = data.activity;
    if (activity.length > 0) {
      const recentActivity = activity.slice(-7);
      const olderActivity = activity.slice(-14, -7);
      
      const recentAvg = recentActivity.reduce((sum, day) => sum + parseInt(day.commits), 0) / recentActivity.length;
      const olderAvg = olderActivity.length > 0 ? 
        olderActivity.reduce((sum, day) => sum + parseInt(day.commits), 0) / olderActivity.length : 0;

      const trendPercent = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg * 100).toFixed(1) : 0;

      insights.trends.push({
        type: 'activity',
        metric: 'Daily Commits',
        current: recentAvg.toFixed(1),
        previous: olderAvg.toFixed(1),
        trend: trendPercent > 10 ? 'increasing' : trendPercent < -10 ? 'decreasing' : 'stable',
        percentage: parseFloat(trendPercent)
      });
    }

    // Agent performance insights
    data.agents.forEach(agent => {
      const successRate = agent.total_tasks > 0 ? (agent.completed / agent.total_tasks * 100) : 0;
      const avgDuration = parseFloat(agent.avg_duration || 0);
      
      insights.summary[agent.agent_name] = {
        totalTasks: agent.total_tasks,
        successRate: successRate.toFixed(1),
        avgDuration: avgDuration.toFixed(1)
      };

      // Detect anomalies
      if (successRate < 80) {
        insights.anomalies.push({
          type: 'performance',
          severity: successRate < 50 ? 'high' : 'medium',
          agent: agent.agent_name,
          message: `${agent.agent_name} success rate is ${successRate.toFixed(1)}%`,
          recommendation: 'Investigate agent performance and error logs'
        });
      }

      if (avgDuration > 300) { // 5 minutes
        insights.anomalies.push({
          type: 'performance',
          severity: 'medium',
          agent: agent.agent_name,
          message: `${agent.agent_name} average task duration is ${(avgDuration / 60).toFixed(1)} minutes`,
          recommendation: 'Optimize task execution or break down complex tasks'
        });
      }
    });

    // Generate recommendations
    if (insights.summary.repositories.activityRate < 70) {
      insights.recommendations.push({
        type: 'maintenance',
        priority: 'high',
        title: 'Low Repository Activity',
        description: `${(100 - insights.summary.repositories.activityRate).toFixed(1)}% of repositories haven\'t been scanned in the last week`,
        action: 'Schedule regular repository scans and review inactive repositories'
      });
    }

    if (data.activity.length > 0) {
      const totalCommits = data.activity.reduce((sum, day) => sum + parseInt(day.commits), 0);
      if (totalCommits < 10) {
        insights.recommendations.push({
          type: 'engagement',
          priority: 'medium',
          title: 'Low Development Activity',
          description: 'Only 10 commits in the last 30 days',
          action: 'Review repository additions and encourage team engagement'
        });
      }
    }

    // Calculate overall score
    let score = 100;
    score -= insights.anomalies.filter(a => a.severity === 'high').length * 20;
    score -= insights.anomalies.filter(a => a.severity === 'medium').length * 10;
    score -= insights.recommendations.filter(r => r.priority === 'high').length * 15;
    score = Math.max(0, Math.min(100, score));
    
    insights.score = score;

    return insights;
  }

  // Get mobile-optimized metrics
  static async getMobileMetrics(userId) {
    try {
      // System health metrics
      const healthMetrics = await pool.query(
        `SELECT 
           'repositories' as metric,
           COUNT(*) as value,
           COUNT(CASE WHEN last_scanned > NOW() - INTERVAL '24 hours' THEN 1 END) as healthy,
           COUNT(CASE WHEN last_scanned <= NOW() - INTERVAL '24 hours' OR last_scanned IS NULL THEN 1 END) as issues
         FROM repositories
         UNION ALL
         SELECT 
           'agents' as metric,
           COUNT(DISTINCT agent_name) as value,
           COUNT(DISTINCT CASE WHEN status = 'idle' THEN agent_name END) as healthy,
           COUNT(DISTINCT CASE WHEN status = 'running' THEN agent_name END) as issues
         FROM agent_tasks
         WHERE created_at > NOW() - INTERVAL '1 hour'`
      );

      // Performance metrics
      const performanceMetrics = await pool.query(
        `SELECT 
           DATE_TRUNC('hour', created_at) as hour,
           COUNT(*) as requests,
           AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_response_time
         FROM agent_tasks
         WHERE created_at > NOW() - INTERVAL '24 hours'
         GROUP BY DATE_TRUNC('hour', created_at)
         ORDER BY hour ASC`
      );

      // Mobile-friendly summary
      const metrics = {
        health: healthMetrics.rows.reduce((acc, row) => {
          acc[row.metric] = {
            total: parseInt(row.value),
            healthy: parseInt(row.healthy),
            issues: parseInt(row.issues),
            healthPercentage: row.value > 0 ? (row.healthy / row.value * 100).toFixed(1) : 0
          };
          return acc;
        }, {}),
        performance: {
          avgResponseTime: performanceMetrics.rows.length > 0 ? 
            (performanceMetrics.rows.reduce((sum, row) => sum + parseFloat(row.avg_response_time || 0), 0) / performanceMetrics.rows.length).toFixed(2) : 0,
          totalRequests: performanceMetrics.rows.reduce((sum, row) => sum + parseInt(row.requests), 0),
          trend: this.calculatePerformanceTrend(performanceMetrics.rows)
        },
        timestamp: new Date().toISOString()
      };

      return metrics;
    } catch (error) {
      console.error('Mobile metrics error:', error);
      throw error;
    }
  }

  // Calculate performance trend
  static calculatePerformanceTrend(data) {
    if (data.length < 2) return 'stable';
    
    const recent = data.slice(-4);
    const previous = data.slice(-8, -4);
    
    if (previous.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, row) => sum + parseInt(row.requests), 0) / recent.length;
    const previousAvg = previous.reduce((sum, row) => sum + parseInt(row.requests), 0) / previous.length;
    
    const change = ((recentAvg - previousAvg) / previousAvg * 100);
    
    if (change > 20) return 'increasing';
    if (change < -20) return 'decreasing';
    return 'stable';
  }
}

// Get AI insights dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const insights = await AIInsightsEngine.analyzeRepositoryInsights(req.user.userId);
    
    res.json({
      insights,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get AI insights error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get mobile-optimized metrics
router.get('/mobile-metrics', authenticateToken, async (req, res) => {
  try {
    const metrics = await AIInsightsEngine.getMobileMetrics(req.user.userId);
    
    res.json({
      metrics,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get mobile metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get anomaly detection results
router.get('/anomalies', authenticateToken, async (req, res) => {
  try {
    const insights = await AIInsightsEngine.analyzeRepositoryInsights(req.user.userId);
    
    res.json({
      anomalies: insights.anomalies,
      total_anomalies: insights.anomalies.length,
      critical_anomalies: insights.anomalies.filter(a => a.severity === 'high').length,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get anomalies error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get actionable recommendations
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const insights = await AIInsightsEngine.analyzeRepositoryInsights(req.user.userId);
    
    // Sort by priority
    const sortedRecommendations = insights.recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    res.json({
      recommendations: sortedRecommendations,
      total_recommendations: sortedRecommendations.length,
      high_priority: sortedRecommendations.filter(r => r.priority === 'high').length,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get system health score
router.get('/health-score', authenticateToken, async (req, res) => {
  try {
    const insights = await AIInsightsEngine.analyzeRepositoryInsights(req.user.userId);
    
    // Categorize score
    let category = 'excellent';
    if (insights.score < 60) category = 'needs-attention';
    else if (insights.score < 80) category = 'good';
    
    res.json({
      score: insights.score,
      category,
      status: insights.score > 80 ? 'healthy' : insights.score > 60 ? 'warning' : 'critical',
      factors: {
        anomalies: insights.anomalies.length,
        recommendations: insights.recommendations.length,
        activityRate: insights.summary.repositories.activityRate
      },
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get health score error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate custom report
router.post('/generate-report', authenticateToken, async (req, res) => {
  try {
    const { type, dateRange, filters } = req.body;
    
    let report = {};
    
    switch (type) {
      case 'performance':
        report = await AIInsightsEngine.getMobileMetrics(req.user.userId);
        break;
      case 'anomalies':
        const insights = await AIInsightsEngine.analyzeRepositoryInsights(req.user.userId);
        report = { anomalies: insights.anomalies, score: insights.score };
        break;
      case 'recommendations':
        const recInsights = await AIInsightsEngine.analyzeRepositoryInsights(req.user.userId);
        report = { recommendations: recInsights.recommendations };
        break;
      default:
        report = await AIInsightsEngine.analyzeRepositoryInsights(req.user.userId);
    }
    
    res.json({
      report_type: type,
      data: report,
      generated_at: new Date().toISOString(),
      filters: filters || {}
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;