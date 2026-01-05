import { apiService } from './apiService';

class InsightsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get dashboard insights
  async getDashboardInsights() {
    try {
      const cacheKey = 'dashboard-insights';
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await apiService.get('/api/insights/dashboard');
      const insights = response.data.insights;
      
      this.setCache(cacheKey, insights);
      return insights;
    } catch (error) {
      console.error('Failed to get dashboard insights:', error);
      throw error;
    }
  }

  // Get mobile-optimized metrics
  async getMobileMetrics() {
    try {
      const cacheKey = 'mobile-metrics';
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await apiService.get('/api/insights/mobile-metrics');
      const metrics = response.data.metrics;
      
      this.setCache(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('Failed to get mobile metrics:', error);
      throw error;
    }
  }

  // Get anomalies
  async getAnomalies() {
    try {
      const response = await apiService.get('/api/insights/anomalies');
      return response.data;
    } catch (error) {
      console.error('Failed to get anomalies:', error);
      throw error;
    }
  }

  // Get recommendations
  async getRecommendations() {
    try {
      const response = await apiService.get('/api/insights/recommendations');
      return response.data;
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      throw error;
    }
  }

  // Get health score
  async getHealthScore() {
    try {
      const cacheKey = 'health-score';
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await apiService.get('/api/insights/health-score');
      const scoreData = response.data;
      
      this.setCache(cacheKey, scoreData);
      return scoreData;
    } catch (error) {
      console.error('Failed to get health score:', error);
      throw error;
    }
  }

  // Generate custom report
  async generateReport(type, dateRange, filters = {}) {
    try {
      const response = await apiService.post('/api/insights/generate-report', {
        type,
        dateRange,
        filters
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  }

  // Get insights for specific module
  async getModuleInsights(module) {
    try {
      const cacheKey = `module-insights-${module}`;
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        return cached;
      }

      const insights = await this.getDashboardInsights();
      
      // Filter insights for specific module
      const moduleInsights = this.filterModuleInsights(insights, module);
      
      this.setCache(cacheKey, moduleInsights);
      return moduleInsights;
    } catch (error) {
      console.error(`Failed to get ${module} insights:`, error);
      throw error;
    }
  }

  // Filter insights for specific module
  filterModuleInsights(insights, module) {
    switch (module) {
      case 'repositories':
        return {
          summary: insights.summary.repositories,
          trends: insights.trends.filter(t => t.type === 'activity'),
          anomalies: insights.anomalies.filter(a => a.type === 'maintenance'),
          recommendations: insights.recommendations.filter(r => r.type === 'maintenance')
        };
      
      case 'agents':
        const agentData = {};
        Object.keys(insights.summary).forEach(key => {
          if (['prometheus', 'ninja', 'grok'].includes(key)) {
            agentData[key] = insights.summary[key];
          }
        });
        
        return {
          summary: agentData,
          trends: insights.trends.filter(t => t.type === 'performance'),
          anomalies: insights.anomalies.filter(a => a.type === 'performance'),
          recommendations: insights.recommendations.filter(r => r.type === 'performance')
        };
      
      default:
        return insights;
    }
  }

  // Get trend data for charts
  async getTrendData(timeRange = '7d') {
    try {
      const metrics = await this.getMobileMetrics();
      
      // Generate trend data based on time range
      const trendData = this.generateTrendData(metrics, timeRange);
      
      return trendData;
    } catch (error) {
      console.error('Failed to get trend data:', error);
      throw error;
    }
  }

  // Generate trend data
  generateTrendData(metrics, timeRange) {
    const now = new Date();
    const data = [];
    
    // Generate mock trend data
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        requests: Math.floor(Math.random() * 100) + 50,
        responseTime: Math.random() * 2 + 0.5,
        errors: Math.floor(Math.random() * 5)
      });
    }
    
    return {
      timeRange,
      data,
      summary: {
        avgRequests: data.reduce((sum, d) => sum + d.requests, 0) / data.length,
        avgResponseTime: data.reduce((sum, d) => sum + d.responseTime, 0) / data.length,
        totalErrors: data.reduce((sum, d) => sum + d.errors, 0)
      }
    };
  }

  // Get performance metrics
  async getPerformanceMetrics() {
    try {
      const mobileMetrics = await this.getMobileMetrics();
      const dashboardInsights = await this.getDashboardInsights();
      
      return {
        system: mobileMetrics.health,
        performance: mobileMetrics.performance,
        agents: dashboardInsights.summary,
        trends: dashboardInsights.trends
      };
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      throw error;
    }
  }

  // Analyze patterns and insights
  async analyzePatterns(data) {
    try {
      const analysis = {
        patterns: [],
        insights: [],
        predictions: []
      };

      // Analyze data for patterns
      if (data && data.length > 0) {
        // Detect trends
        const trend = this.detectTrend(data);
        if (trend) {
          analysis.patterns.push({
            type: 'trend',
            description: trend.description,
            confidence: trend.confidence
          });
        }

        // Detect anomalies
        const anomalies = this.detectAnomalies(data);
        analysis.insights.push(...anomalies);

        // Generate predictions
        const predictions = this.generatePredictions(data);
        analysis.predictions.push(...predictions);
      }

      return analysis;
    } catch (error) {
      console.error('Failed to analyze patterns:', error);
      throw error;
    }
  }

  // Detect trends in data
  detectTrend(data) {
    if (data.length < 3) return null;

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    let trend, confidence;
    if (Math.abs(change) < 5) {
      trend = 'stable';
      confidence = 80;
    } else if (change > 0) {
      trend = 'increasing';
      confidence = Math.min(95, 70 + Math.abs(change));
    } else {
      trend = 'decreasing';
      confidence = Math.min(95, 70 + Math.abs(change));
    }

    return {
      description: `Values are ${trend} by ${Math.abs(change).toFixed(1)}%`,
      trend,
      change,
      confidence
    };
  }

  // Detect anomalies in data
  detectAnomalies(data) {
    const anomalies = [];
    
    if (data.length < 3) return anomalies;

    // Calculate mean and standard deviation
    const values = data.map(d => d.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Find outliers (values more than 2 standard deviations from mean)
    data.forEach((point, index) => {
      const zScore = Math.abs((point.value - mean) / stdDev);
      if (zScore > 2) {
        anomalies.push({
          type: 'outlier',
          index,
          value: point.value,
          expected: mean,
          severity: zScore > 3 ? 'high' : 'medium',
          description: `Unusual value detected: ${point.value} (${zScore.toFixed(1)}σ from mean)`
        });
      }
    });

    return anomalies;
  }

  // Generate predictions
  generatePredictions(data) {
    const predictions = [];
    
    if (data.length < 3) return predictions;

    // Simple linear regression for prediction
    const n = data.length;
    const x = data.map((_, i) => i);
    const y = data.map(d => d.value);

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict next value
    const nextX = n;
    const prediction = slope * nextX + intercept;
    const lastValue = y[y.length - 1];

    predictions.push({
      type: 'trend',
      nextValue: Math.round(prediction * 100) / 100,
      change: Math.round((prediction - lastValue) * 100) / 100,
      confidence: Math.max(0, Math.min(100, 100 - (Math.abs(slope) * 10))),
      description: `Next value predicted to be ${prediction.toFixed(2)} (${prediction > lastValue ? '+' : ''}${(prediction - lastValue).toFixed(2)})`
    });

    return predictions;
  }

  // Cache management
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTimeout;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clearCache() {
    this.cache.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: JSON.stringify(Array.from(this.cache.entries())).length
    };
  }
}

export const insightsService = new InsightsService();
export default insightsService;