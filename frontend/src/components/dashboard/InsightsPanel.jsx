import React, { useState, useEffect } from 'react';
import { 
  SparklesIcon, 
  TrendingUpIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  InformationCircleIcon,
  ChevronRightIcon,
  RefreshIcon
} from '@heroicons/react/24/outline';
import { insightsService } from '../../services/insightsService';

const InsightsPanel = () => {
  const [insights, setInsights] = useState(null);
  const [healthScore, setHealthScore] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);
      
      const [dashboardInsights, healthScoreData, anomaliesData, recommendationsData] = await Promise.all([
        insightsService.getDashboardInsights(),
        insightsService.getHealthScore(),
        insightsService.getAnomalies(),
        insightsService.getRecommendations()
      ]);

      setInsights(dashboardInsights);
      setHealthScore(healthScoreData);
      setAnomalies(anomaliesData.anomalies);
      setRecommendations(recommendationsData.recommendations);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    insightsService.clearCache();
    await loadInsights();
    setRefreshing(false);
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="card-mobile">
        <div className="flex items-center justify-center h-32">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <SparklesIcon className="h-5 w-5 mr-2 text-primary-600" />
          AI Insights
        </h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <RefreshIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Health Score */}
      {healthScore && (
        <div className="card-mobile">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">System Health</h3>
            <span className={`text-xs px-2 py-1 rounded-full ${getScoreColor(healthScore.score)}`}>
              {healthScore.score}/100
            </span>
          </div>
          
          <div className="mb-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  healthScore.score >= 90 ? 'bg-green-500' :
                  healthScore.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${healthScore.score}%` }}
              ></div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Status: {healthScore.status}</span>
            <span>{healthScore.category}</span>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {insights && (
        <div className="card-mobile">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Key Metrics</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <ChartBarIcon className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Repositories</p>
                  <p className="text-xs text-gray-500">{insights.summary.repositories?.active || 0} active</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">{insights.summary.repositories?.total || 0}</p>
                <p className="text-xs text-gray-500">{insights.summary.repositories?.activityRate || 0}% active</p>
              </div>
            </div>

            {Object.entries(insights.summary).filter(([key]) => ['prometheus', 'ninja', 'grok'].includes(key)).map(([agent, data]) => (
              <div key={agent} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-xs font-bold text-purple-600">
                      {agent.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">{agent}</p>
                    <p className="text-xs text-gray-500">{data.successRate}% success</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">{data.totalTasks}</p>
                  <p className="text-xs text-gray-500">{data.avgDuration}s avg</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends */}
      {insights && insights.trends.length > 0 && (
        <div className="card-mobile">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <TrendingUpIcon className="h-4 w-4 mr-1" />
            Recent Trends
          </h3>
          
          <div className="space-y-2">
            {insights.trends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{trend.metric}</p>
                  <p className="text-xs text-gray-500">{trend.current} vs {trend.previous}</p>
                </div>
                <div className="flex items-center">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    trend.trend === 'increasing' ? 'text-green-600 bg-green-100' :
                    trend.trend === 'decreasing' ? 'text-red-600 bg-red-100' :
                    'text-gray-600 bg-gray-100'
                  }`}>
                    {trend.trend === 'increasing' ? '↑' :
                     trend.trend === 'decreasing' ? '↓' : '→'}
                    {Math.abs(trend.percentage).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className="card-mobile">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <ExclamationTriangleIcon className="h-4 w-4 mr-1 text-yellow-500" />
            Anomalies Detected
          </h3>
          
          <div className="space-y-2">
            {anomalies.slice(0, 3).map((anomaly, index) => (
              <div key={index} className="p-3 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{anomaly.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{anomaly.recommendation}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(anomaly.severity)}`}>
                    {anomaly.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {anomalies.length > 3 && (
            <button className="w-full mt-2 text-sm text-primary-600 hover:text-primary-700">
              View all {anomalies.length} anomalies
            </button>
          )}
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="card-mobile">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <InformationCircleIcon className="h-4 w-4 mr-1 text-blue-500" />
            Recommendations
          </h3>
          
          <div className="space-y-3">
            {recommendations.slice(0, 3).map((rec, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-3 py-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{rec.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
                    <p className="text-xs text-primary-600 mt-2">{rec.action}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(rec.priority)}`}>
                    {rec.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {recommendations.length > 3 && (
            <button className="w-full mt-2 text-sm text-primary-600 hover:text-primary-700 flex items-center justify-center">
              View all {recommendations.length} recommendations
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </button>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="card-mobile">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
        
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-secondary text-sm py-3">
            Generate Report
          </button>
          <button className="btn-secondary text-sm py-3">
            View Details
          </button>
          <button className="btn-secondary text-sm py-3">
            Export Data
          </button>
          <button className="btn-secondary text-sm py-3">
            Schedule Check
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsightsPanel;