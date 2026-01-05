import React, { useState, useEffect } from 'react';
import { 
  CpuChipIcon, 
  PlayIcon, 
  StopIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../services/apiService';

const Agents = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await apiService.getAgents();
      setAgents(response.data.agents || []);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAgent = async (agentId) => {
    try {
      await apiService.startAgent(agentId, {});
      loadAgents();
    } catch (error) {
      console.error('Failed to start agent:', error);
    }
  };

  const handleStopAgent = async (agentId) => {
    try {
      await apiService.stopAgent(agentId);
      loadAgents();
    } catch (error) {
      console.error('Failed to stop agent:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        AI Agents
      </h1>

      <div className="space-y-3">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onStart={() => handleStartAgent(agent.id)}
            onStop={() => handleStopAgent(agent.id)}
          />
        ))}
      </div>
    </div>
  );
};

const AgentCard = ({ agent, onStart, onStop }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'green';
      case 'idle': return 'blue';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="card-mobile">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {agent.name}
          </h3>
          <p className="text-sm text-gray-500">
            {agent.description}
          </p>
        </div>
        <span className={`badge badge-${getStatusColor(agent.status)}`}>
          {agent.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {agent.recent_stats?.completed || 0}
          </p>
          <p className="text-xs text-gray-500">Completed Tasks</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {agent.recent_stats?.running || 0}
          </p>
          <p className="text-xs text-gray-500">Running Tasks</p>
        </div>
      </div>

      <div className="flex space-x-2">
        {agent.status === 'idle' ? (
          <button onClick={onStart} className="btn-primary flex-1">
            <PlayIcon className="h-4 w-4 mr-1" />
            Start
          </button>
        ) : (
          <button onClick={onStop} className="btn-danger flex-1">
            <StopIcon className="h-4 w-4 mr-1" />
            Stop
          </button>
        )}
        <button className="btn-secondary">
          <ChartBarIcon className="h-4 w-4" />
        </button>
        <button className="btn-secondary">
          <ClockIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Agents;