const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('./auth');
const cron = require('node-cron');
const router = express.Router();

// Agent configurations
const AGENT_CONFIGS = {
  prometheus: {
    name: 'Prometheus',
    description: 'Security and monitoring specialist',
    capabilities: ['security_analysis', 'vulnerability_scanning', 'performance_monitoring', 'compliance_checking'],
    schedule: '0 */2 * * *', // Every 2 hours
    priority: 1,
    max_concurrent_tasks: 3
  },
  ninja: {
    name: 'Ninja',
    description: 'Full-stack development and automation',
    capabilities: ['code_generation', 'repository_maintenance', 'deployment', 'testing'],
    schedule: '0 */4 * * *', // Every 4 hours
    priority: 2,
    max_concurrent_tasks: 5
  },
  grok: {
    name: 'Grok',
    description: 'Data analysis and insights',
    capabilities: ['data_analysis', 'pattern_recognition', 'reporting', 'visualization'],
    schedule: '0 0 */6 * *', // Every 6 hours
    priority: 3,
    max_concurrent_tasks: 2
  }
};

// Active agents registry
const activeAgents = new Map();

// Initialize agents
const initializeAgents = () => {
  for (const [agentId, config] of Object.entries(AGENT_CONFIGS)) {
    activeAgents.set(agentId, {
      ...config,
      status: 'idle',
      current_tasks: [],
      last_heartbeat: new Date(),
      total_tasks_completed: 0,
      total_tasks_failed: 0,
      average_task_duration: 0
    });
    
    // Schedule agent tasks
    cron.schedule(config.schedule, () => {
      scheduleAgentTask(agentId);
    });
  }
};

// Schedule task for agent
const scheduleAgentTask = async (agentId) => {
  try {
    const agent = activeAgents.get(agentId);
    if (!agent || agent.current_tasks.length >= agent.max_concurrent_tasks) {
      return;
    }
    
    // Determine next task based on agent capabilities
    const task = await getNextTaskForAgent(agentId);
    if (!task) {
      return;
    }
    
    // Execute task
    await executeAgentTask(agentId, task);
  } catch (error) {
    console.error(`Error scheduling task for agent ${agentId}:`, error);
  }
};

// Get next task for agent
const getNextTaskForAgent = async (agentId) => {
  const agent = AGENT_CONFIGS[agentId];
  const capabilities = agent.capabilities;
  
  // Define task queue based on capabilities
  const taskQueue = [];
  
  if (capabilities.includes('security_analysis')) {
    taskQueue.push({
      type: 'security_scan',
      description: 'Perform security vulnerability scan',
      priority: 'high'
    });
  }
  
  if (capabilities.includes('repository_maintenance')) {
    taskQueue.push({
      type: 'dependency_update',
      description: 'Check and update outdated dependencies',
      priority: 'medium'
    });
  }
  
  if (capabilities.includes('performance_monitoring')) {
    taskQueue.push({
      type: 'performance_check',
      description: 'Monitor system performance metrics',
      priority: 'medium'
    });
  }
  
  if (capabilities.includes('data_analysis')) {
    taskQueue.push({
      type: 'generate_insights',
      description: 'Generate data insights and reports',
      priority: 'low'
    });
  }
  
  // Return highest priority task that hasn't been run recently
  for (const task of taskQueue) {
    const recentTask = await pool.query(
      'SELECT id FROM agent_tasks WHERE agent_name = $1 AND task_type = $2 AND created_at > NOW() - INTERVAL \'1 hour\'',
      [agentId, task.type]
    );
    
    if (recentTask.rows.length === 0) {
      return task;
    }
  }
  
  return null;
};

// Execute agent task
const executeAgentTask = async (agentId, task) => {
  const agent = activeAgents.get(agentId);
  if (!agent) return;
  
  // Update agent status
  agent.status = 'running';
  agent.current_tasks.push(task.type);
  agent.last_heartbeat = new Date();
  
  // Create task record
  const taskResult = await pool.query(
    'INSERT INTO agent_tasks (agent_name, task_type, task_data, status) VALUES ($1, $2, $3, $4) RETURNING *',
    [agentId, task.type, task, 'running']
  );
  
  const taskId = taskResult.rows[0].id;
  
  try {
    // Execute task based on type
    let result = null;
    
    switch (task.type) {
      case 'security_scan':
        result = await executeSecurityScan();
        break;
      case 'dependency_update':
        result = await executeDependencyUpdate();
        break;
      case 'performance_check':
        result = await executePerformanceCheck();
        break;
      case 'generate_insights':
        result = await executeGenerateInsights();
        break;
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
    
    // Update task as completed
    await pool.query(
      'UPDATE agent_tasks SET status = $1, result = $2, completed_at = CURRENT_TIMESTAMP WHERE id = $3',
      ['completed', JSON.stringify(result), taskId]
    );
    
    // Update agent stats
    agent.total_tasks_completed++;
    agent.status = 'idle';
    agent.current_tasks = agent.current_tasks.filter(t => t !== task.type);
    
    console.log(`✅ ${agent.name} completed task: ${task.type}`);
    
  } catch (error) {
    // Update task as failed
    await pool.query(
      'UPDATE agent_tasks SET status = $1, error_message = $2, completed_at = CURRENT_TIMESTAMP WHERE id = $3',
      ['failed', error.message, taskId]
    );
    
    // Update agent stats
    agent.total_tasks_failed++;
    agent.status = 'idle';
    agent.current_tasks = agent.current_tasks.filter(t => t !== task.type);
    
    console.error(`❌ ${agent.name} failed task: ${task.type}`, error);
  }
};

// Task execution functions
const executeSecurityScan = async () => {
  // Simulate security scan
  return {
    vulnerabilities_found: Math.floor(Math.random() * 5),
    security_score: 85 + Math.floor(Math.random() * 15),
    recommendations: ['Update dependencies', 'Enable HTTPS', 'Add rate limiting'],
    scan_duration: '45s'
  };
};

const executeDependencyUpdate = async () => {
  // Simulate dependency update check
  return {
    packages_scanned: 50,
    outdated_packages: Math.floor(Math.random() * 10),
    security_updates: Math.floor(Math.random() * 3),
    auto_updates_available: Math.floor(Math.random() * 5)
  };
};

const executePerformanceCheck = async () => {
  // Simulate performance check
  return {
    cpu_usage: Math.random() * 100,
    memory_usage: Math.random() * 100,
    response_time: Math.random() * 500,
    uptime: process.uptime()
  };
};

const executeGenerateInsights = async () => {
  // Simulate insights generation
  return {
    repositories_analyzed: 10,
    patterns_found: Math.floor(Math.random() * 20),
    recommendations: Math.floor(Math.random() * 8),
    insight_score: 75 + Math.random() * 25
  };
};

// API Routes

// Get all agents
router.get('/', authenticateToken, async (req, res) => {
  try {
    const agents = [];
    
    for (const [agentId, agent] of activeAgents) {
      // Get recent task statistics
      const taskStats = await pool.query(
        `SELECT 
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration
        FROM agent_tasks 
        WHERE agent_name = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
        [agentId]
      );
      
      agents.push({
        id: agentId,
        ...agent,
        recent_stats: taskStats.rows[0]
      });
    }
    
    res.json({ agents });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get agent by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const agent = activeAgents.get(id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Get detailed task history
    const taskHistory = await pool.query(
      'SELECT * FROM agent_tasks WHERE agent_name = $1 ORDER BY created_at DESC LIMIT 20',
      [id]
    );
    
    // Get performance metrics
    const performance = await pool.query(
      `SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as tasks_completed,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as success_rate
      FROM agent_tasks 
      WHERE agent_name = $1 AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC`,
      [id]
    );
    
    res.json({
      agent: {
        id,
        ...agent
      },
      task_history: taskHistory.rows,
      performance_metrics: performance.rows
    });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update agent configuration
router.put('/:id/config', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { schedule, priority, max_concurrent_tasks, capabilities } = req.body;
    
    const agent = activeAgents.get(id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Update configuration
    if (schedule) agent.schedule = schedule;
    if (priority) agent.priority = parseInt(priority);
    if (max_concurrent_tasks) agent.max_concurrent_tasks = parseInt(max_concurrent_tasks);
    if (capabilities) agent.capabilities = capabilities;
    
    // In production, this would persist to database
    
    res.json({
      message: 'Agent configuration updated successfully',
      agent: { id, ...agent }
    });
  } catch (error) {
    console.error('Update agent config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start agent manually
router.post('/:id/start', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { task_type } = req.body;
    
    const agent = activeAgents.get(id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    if (agent.status !== 'idle') {
      return res.status(409).json({ error: 'Agent is currently busy' });
    }
    
    const task = task_type 
      ? { type: task_type, description: `Manual task: ${task_type}` }
      : await getNextTaskForAgent(id);
    
    if (!task) {
      return res.status(404).json({ error: 'No tasks available for this agent' });
    }
    
    // Execute task in background
    executeAgentTask(id, task).catch(console.error);
    
    res.json({
      message: 'Agent started successfully',
      task: task.type
    });
  } catch (error) {
    console.error('Start agent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stop agent
router.post('/:id/stop', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const agent = activeAgents.get(id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Cancel running tasks
    for (const taskType of agent.current_tasks) {
      await pool.query(
        'UPDATE agent_tasks SET status = $1, error_message = $2 WHERE agent_name = $3 AND status = $4',
        ['cancelled', 'Manually stopped', id, 'running']
      );
    }
    
    agent.status = 'idle';
    agent.current_tasks = [];
    
    res.json({
      message: 'Agent stopped successfully',
      cancelled_tasks: agent.current_tasks.length
    });
  } catch (error) {
    console.error('Stop agent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get agent logs
router.get('/:id/logs', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { level = 'all', limit = 100 } = req.query;
    
    let query = 'SELECT * FROM agent_tasks WHERE agent_name = $1';
    const params = [id];
    
    if (level !== 'all') {
      if (level === 'errors') {
        query += ' AND status = $2';
        params.push('failed');
      } else if (level === 'success') {
        query += ' AND status = $2';
        params.push('completed');
      }
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit));
    
    const result = await pool.query(query, params);
    
    res.json({
      logs: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Get agent logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get workflow status
router.get('/workflows/status', authenticateToken, async (req, res) => {
  try {
    // Get workflow statistics
    const workflowStats = await pool.query(`
      SELECT 
        task_type as workflow_type,
        COUNT(*) as total_executions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration
      FROM agent_tasks
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY task_type
      ORDER BY total_executions DESC
    `);
    
    // Get active workflows
    const activeWorkflows = await pool.query(`
      SELECT 
        agent_name,
        task_type,
        status,
        created_at,
        EXTRACT(EPOCH FROM (NOW() - created_at)) as running_time
      FROM agent_tasks
      WHERE status IN ('running', 'pending')
      ORDER BY created_at ASC
    `);
    
    // Get workflow queue
    const queuedWorkflows = await pool.query(`
      SELECT 
        agent_name,
        task_type,
        priority,
        created_at
      FROM agent_tasks
      WHERE status = 'pending'
      ORDER BY 
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END ASC,
        created_at ASC
      LIMIT 20
    `);
    
    res.json({
      statistics: workflowStats.rows,
      active_workflows: activeWorkflows.rows,
      queued_workflows: queuedWorkflows.rows
    });
  } catch (error) {
    console.error('Get workflow status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create custom workflow
router.post('/workflows/create', authenticateToken, async (req, res) => {
  try {
    const { name, description, agent_id, task_type, schedule, priority = 'medium' } = req.body;
    
    if (!name || !agent_id || !task_type) {
      return res.status(400).json({ error: 'Name, agent ID, and task type are required' });
    }
    
    const agent = activeAgents.get(agent_id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Create workflow task
    const taskData = {
      name,
      description,
      schedule,
      priority,
      custom_workflow: true
    };
    
    const result = await pool.query(
      `INSERT INTO agent_tasks (agent_name, task_type, task_data, status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [agent_id, task_type, taskData, 'pending']
    );
    
    res.status(201).json({
      message: 'Workflow created successfully',
      workflow: result.rows[0]
    });
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get coordination matrix
router.get('/coordination/matrix', authenticateToken, async (req, res) => {
  try {
    // Build coordination matrix showing agent interactions
    const coordination = {};
    
    for (const agentId of Object.keys(AGENT_CONFIGS)) {
      coordination[agentId] = {};
      
      for (const otherAgentId of Object.keys(AGENT_CONFIGS)) {
        if (agentId === otherAgentId) {
          coordination[agentId][otherAgentId] = {
            interaction_count: 0,
            last_interaction: null,
            collaboration_score: 0
          };
        } else {
          // Get interaction data between agents
          const interactionData = await pool.query(
            `SELECT 
              COUNT(*) as interaction_count,
              MAX(created_at) as last_interaction
            FROM agent_tasks 
            WHERE (agent_name = $1 AND task_data::text LIKE $2) 
               OR (agent_name = $2 AND task_data::text LIKE $1)
            `,
            [agentId, otherAgentId]
          );
          
          const interactions = interactionData.rows[0];
          const collaborationScore = Math.min(interactions.interaction_count * 10, 100);
          
          coordination[agentId][otherAgentId] = {
            interaction_count: interactions.interaction_count,
            last_interaction: interactions.last_interaction,
            collaboration_score: collaborationScore
          };
        }
      }
    }
    
    res.json({
      coordination_matrix: coordination,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get coordination matrix error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize agents on module load
initializeAgents();

module.exports = router;