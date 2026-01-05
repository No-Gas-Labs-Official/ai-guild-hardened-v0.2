const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('./auth');
const { Octokit } = require('@octokit/rest');
const router = express.Router();

// Initialize GitHub client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || 'GITHUB_TOKEN_REMOVED'
});

// CLI command handlers
const CLI_COMMANDS = {
  scan: handleScanCommand,
  map: handleMapCommand,
  'init-project': handleInitProjectCommand,
  'review-repo': handleReviewRepoCommand,
  'status-nodes': handleStatusNodesCommand,
  'deploy': handleDeployCommand,
  'analyze': handleAnalyzeCommand,
  'maintain': handleMaintainCommand,
  'monitor': handleMonitorCommand,
  'export': handleExportCommand
};

// Process CLI command
router.post('/execute', authenticateToken, async (req, res) => {
  try {
    const { command, args = [], options = {} } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }
    
    const handler = CLI_COMMANDS[command];
    if (!handler) {
      return res.status(400).json({ error: `Unknown command: ${command}` });
    }
    
    // Execute command
    const result = await handler(req.user, args, options);
    
    // Log command execution
    await pool.query(
      `INSERT INTO agent_tasks (agent_name, task_type, task_data, status, result) 
       VALUES ($1, $2, $3, $4, $5)`,
      ['cli', command, { args, options }, 'completed', JSON.stringify(result)]
    );
    
    res.json({
      command,
      result,
      executed_at: new Date().toISOString(),
      executed_by: req.user.username
    });
  } catch (error) {
    console.error('CLI command execution error:', error);
    
    // Log failed command
    await pool.query(
      `INSERT INTO agent_tasks (agent_name, task_type, task_data, status, error_message) 
       VALUES ($1, $2, $3, $4, $5)`,
      ['cli', req.body.command || 'unknown', { args: req.body.args, options: req.body.options }, 'failed', error.message]
    );
    
    res.status(500).json({ 
      error: 'Command execution failed', 
      message: error.message 
    });
  }
});

// Get available commands
router.get('/commands', authenticateToken, (req, res) => {
  const commands = Object.keys(CLI_COMMANDS).map(cmd => ({
    name: cmd,
    description: getCommandDescription(cmd),
    usage: getCommandUsage(cmd),
    examples: getCommandExamples(cmd)
  }));
  
  res.json({ commands });
});

// Command handlers

async function handleScanCommand(user, args, options) {
  const { repo_url, depth = 'shallow' } = options;
  
  if (!repo_url) {
    throw new Error('Repository URL is required. Use --repo-url=https://github.com/user/repo');
  }
  
  // Parse repository URL
  const match = repo_url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error('Invalid GitHub repository URL');
  }
  
  const [, owner, repoName] = match;
  
  // Add repository to monitoring
  const existingRepo = await pool.query(
    'SELECT id FROM repositories WHERE owner = $1 AND name = $2',
    [owner, repoName]
  );
  
  let repoId;
  if (existingRepo.rows.length === 0) {
    const result = await pool.query(
      'INSERT INTO repositories (name, url, owner) VALUES ($1, $2, $3) RETURNING *',
      [repoName, repo_url, owner]
    );
    repoId = result.rows[0].id;
  } else {
    repoId = existingRepo.rows[0].id;
  }
  
  // Trigger scan (simplified for CLI)
  await pool.query('UPDATE repositories SET last_scanned = CURRENT_TIMESTAMP WHERE id = $1', [repoId]);
  
  return {
    action: 'scan',
    repository: `${owner}/${repoName}`,
    repo_id: repoId,
    status: 'initiated',
    depth,
    message: `Repository scan initiated. Use 'status-nodes' to monitor progress.`
  };
}

async function handleMapCommand(user, args, options) {
  const { repo_id, format = 'json' } = options;
  
  if (!repo_id) {
    throw new Error('Repository ID is required. Use --repo-id=<id>');
  }
  
  // Get repository information
  const repoResult = await pool.query('SELECT * FROM repositories WHERE id = $1', [repo_id]);
  if (repoResult.rows.length === 0) {
    throw new Error('Repository not found');
  }
  
  const repo = repoResult.rows[0];
  
  // Get architecture patterns
  const patternsResult = await pool.query(
    'SELECT * FROM architecture_patterns WHERE repo_id = $1 ORDER BY confidence_score DESC',
    [repo_id]
  );
  
  const mapData = {
    repository: {
      id: repo.id,
      name: repo.name,
      owner: repo.owner,
      url: repo.url
    },
    patterns: patternsResult.rows,
    generated_at: new Date().toISOString()
  };
  
  if (format === 'mermaid') {
    mapData.mermaid_diagram = generateMermaidArchitecture(patternsResult.rows);
  }
  
  return {
    action: 'map',
    repository: `${repo.owner}/${repo.name}`,
    patterns_found: patternsResult.rows.length,
    format,
    data: mapData
  };
}

async function handleInitProjectCommand(user, args, options) {
  const { name, type = 'web-app', template = 'basic', description } = options;
  
  if (!name) {
    throw new Error('Project name is required. Use --name=<project-name>');
  }
  
  // Create prototype record
  const prototypeData = {
    name,
    description: description || `Generated ${type} project`,
    project_type: type,
    template,
    features: getDefaultFeatures(type)
  };
  
  const result = await pool.query(
    `INSERT INTO prototypes (name, description, project_type, generated_code, status, created_by) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     RETURNING *`,
    [
      name,
      prototypeData.description,
      type,
      JSON.stringify(prototypeData),
      'draft',
      user.userId
    ]
  );
  
  return {
    action: 'init-project',
    project: name,
    type,
    template,
    prototype_id: result.rows[0].id,
    status: 'created',
    message: `Project "${name}" initialized successfully. Use CLI or dashboard to customize and generate code.`
  };
}

async function handleReviewRepoCommand(user, args, options) {
  const { repo_id, include_code = false } = options;
  
  if (!repo_id) {
    throw new Error('Repository ID is required. Use --repo-id=<id>');
  }
  
  // Get repository data
  const repoResult = await pool.query('SELECT * FROM repositories WHERE id = $1', [repo_id]);
  if (repoResult.rows.length === 0) {
    throw new Error('Repository not found');
  }
  
  const repo = repoResult.rows[0];
  
  // Get commits
  const commitsResult = await pool.query(
    'SELECT COUNT(*) as total, author FROM commits WHERE repo_id = $1 GROUP BY author ORDER BY total DESC',
    [repo_id]
  );
  
  // Get dependencies
  const depsResult = await pool.query(
    'SELECT * FROM dependencies WHERE repo_id = $1 ORDER BY name',
    [repo_id]
  );
  
  const review = {
    repository: {
      name: repo.name,
      owner: repo.owner,
      stars: repo.stars,
      forks: repo.forks,
      last_scanned: repo.last_scanned
    },
    summary: {
      total_commits: commitsResult.rows.reduce((sum, row) => sum + parseInt(row.total), 0),
      contributors: commitsResult.rows.length,
      dependencies: depsResult.rows.length,
      outdated_dependencies: depsResult.rows.filter(d => d.is_outdated).length,
      vulnerable_dependencies: depsResult.rows.filter(d => d.security_vulnerability).length
    },
    top_contributors: commitsResult.rows.slice(0, 5),
    recommendations: generateRecommendations(repo, depsResult.rows)
  };
  
  return {
    action: 'review-repo',
    repository: `${repo.owner}/${repo.name}`,
    review,
    generated_at: new Date().toISOString()
  };
}

async function handleStatusNodesCommand(user, args, options) {
  const { agent_name, detailed = false } = options;
  
  let query = `
    SELECT 
      agent_name,
      COUNT(*) as total_tasks,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
      MAX(created_at) as last_activity
    FROM agent_tasks
    WHERE created_at > NOW() - INTERVAL '24 hours'
  `;
  
  const params = [];
  
  if (agent_name) {
    query += ' AND agent_name = $1';
    params.push(agent_name);
  }
  
  query += ' GROUP BY agent_name ORDER BY last_activity DESC';
  
  const result = await pool.query(query, params);
  
  const status = {
    agents: result.rows,
    overall: {
      total_agents: result.rows.length,
      active_agents: result.rows.filter(r => r.running > 0).length,
      total_tasks: result.rows.reduce((sum, r) => sum + parseInt(r.total_tasks), 0),
      success_rate: calculateSuccessRate(result.rows)
    },
    generated_at: new Date().toISOString()
  };
  
  if (detailed) {
    // Get recent task details
    const recentTasks = await pool.query(
      `SELECT agent_name, task_type, status, created_at, completed_at 
       FROM agent_tasks 
       WHERE created_at > NOW() - INTERVAL '6 hours'
       ORDER BY created_at DESC 
       LIMIT 20`,
      agent_name ? [agent_name] : []
    );
    
    status.recent_tasks = recentTasks.rows;
  }
  
  return {
    action: 'status-nodes',
    status
  };
}

async function handleDeployCommand(user, args, options) {
  const { prototype_id, environment = 'staging' } = options;
  
  if (!prototype_id) {
    throw new Error('Prototype ID is required. Use --prototype-id=<id>');
  }
  
  // Get prototype
  const prototypeResult = await pool.query(
    'SELECT * FROM prototypes WHERE id = $1 AND created_by = $2',
    [prototype_id, user.userId]
  );
  
  if (prototypeResult.rows.length === 0) {
    throw new Error('Prototype not found or access denied');
  }
  
  const prototype = prototypeResult.rows[0];
  
  // Simulate deployment
  const deploymentUrl = `https://${prototype.name.toLowerCase().replace(/\s+/g, '-')}-${environment}-${Date.now()}.example.com`;
  
  // Update prototype
  await pool.query(
    'UPDATE prototypes SET deployment_url = $1, status = $2 WHERE id = $3',
    [deploymentUrl, 'deployed', prototype_id]
  );
  
  return {
    action: 'deploy',
    prototype: prototype.name,
    environment,
    deployment_url: deploymentUrl,
    status: 'deployed',
    message: `Prototype deployed successfully to ${environment}.`
  };
}

async function handleAnalyzeCommand(user, args, options) {
  const { repo_id, analysis_type = 'comprehensive' } = options;
  
  if (!repo_id) {
    throw new Error('Repository ID is required. Use --repo-id=<id>');
  }
  
  const repoResult = await pool.query('SELECT * FROM repositories WHERE id = $1', [repo_id]);
  if (repoResult.rows.length === 0) {
    throw new Error('Repository not found');
  }
  
  const repo = repoResult.rows[0];
  
  let analysis = {};
  
  switch (analysis_type) {
    case 'security':
      analysis = await performSecurityAnalysis(repo_id);
      break;
    case 'performance':
      analysis = await performPerformanceAnalysis(repo_id);
      break;
    case 'architecture':
      analysis = await performArchitectureAnalysis(repo_id);
      break;
    default:
      analysis = await performComprehensiveAnalysis(repo_id);
  }
  
  return {
    action: 'analyze',
    repository: `${repo.owner}/${repo.name}`,
    analysis_type,
    analysis,
    generated_at: new Date().toISOString()
  };
}

async function handleMaintainCommand(user, args, options) {
  const { repo_id, auto_fix = false } = options;
  
  if (!repo_id) {
    throw new Error('Repository ID is required. Use --repo-id=<id>');
  }
  
  const repoResult = await pool.query('SELECT * FROM repositories WHERE id = $1', [repo_id]);
  if (repoResult.rows.length === 0) {
    throw new Error('Repository not found');
  }
  
  const repo = repoResult.rows[0];
  
  // Check maintenance needs
  const maintenanceNeeds = await checkMaintenanceNeeds(repo_id);
  
  if (auto_fix && maintenanceNeeds.length > 0) {
    // Create maintenance tasks
    for (const need of maintenanceNeeds) {
      await pool.query(
        `INSERT INTO agent_tasks (agent_name, task_type, task_data, status) 
         VALUES ($1, $2, $3, $4)`,
        ['maintainer', need.type, need, 'pending']
      );
    }
  }
  
  return {
    action: 'maintain',
    repository: `${repo.owner}/${repo.name}`,
    issues_found: maintenanceNeeds.length,
    maintenance_needs: maintenanceNeeds,
    auto_fix_enabled: auto_fix,
    message: auto_fix 
      ? `Maintenance tasks created for ${maintenanceNeeds.length} issues.`
      : `Found ${maintenanceNeeds.length} maintenance issues. Use --auto-fix to create tasks.`
  };
}

async function handleMonitorCommand(user, args, options) {
  const { duration = '1h', metrics = 'all' } = options;
  
  // Get monitoring data
  const monitoringData = await getMonitoringData(duration, metrics);
  
  return {
    action: 'monitor',
    duration,
    metrics,
    data: monitoringData,
    generated_at: new Date().toISOString()
  };
}

async function handleExportCommand(user, args, options) {
  const { type = 'overview', format = 'json', repo_id } = options;
  
  let exportData = {};
  
  switch (type) {
    case 'repositories':
      exportData = await exportRepositories(repo_id);
      break;
    case 'agents':
      exportData = await exportAgents();
      break;
    case 'tasks':
      exportData = await exportTasks();
      break;
    default:
      exportData = await exportOverview();
  }
  
  return {
    action: 'export',
    type,
    format,
    data: exportData,
    exported_at: new Date().toISOString(),
    exported_by: user.username
  };
}

// Helper functions

function getCommandDescription(command) {
  const descriptions = {
    scan: 'Scan and analyze a GitHub repository',
    map: 'Generate architecture maps and visualizations',
    'init-project': 'Initialize a new project prototype',
    'review-repo': 'Review repository health and metrics',
    'status-nodes': 'Check status of all agents and nodes',
    deploy: 'Deploy a prototype to specified environment',
    analyze: 'Perform detailed analysis of repository',
    maintain: 'Check and fix repository maintenance issues',
    monitor: 'Monitor system metrics and performance',
    export: 'Export system data in various formats'
  };
  return descriptions[command] || 'No description available';
}

function getCommandUsage(command) {
  const usages = {
    scan: 'scan --repo-url=<github-url> [--depth=<shallow|deep>]',
    map: 'map --repo-id=<id> [--format=<json|mermaid>]',
    'init-project': 'init-project --name=<project-name> [--type=<web-app|mobile-app|api>] [--template=<basic|advanced>]',
    'review-repo': 'review-repo --repo-id=<id> [--include-code=<true|false>]',
    'status-nodes': 'status-nodes [--agent-name=<name>] [--detailed=<true|false>]',
    deploy: 'deploy --prototype-id=<id> [--environment=<staging|production>]',
    analyze: 'analyze --repo-id=<id> [--analysis-type=<security|performance|architecture|comprehensive>]',
    maintain: 'maintain --repo-id=<id> [--auto-fix=<true|false>]',
    monitor: 'monitor [--duration=<1h|6h|24h>] [--metrics=<all|performance|security>]',
    export: 'export --type=<overview|repositories|agents|tasks> [--format=<json|csv>] [--repo-id=<id>]'
  };
  return usages[command] || command;
}

function getCommandExamples(command) {
  const examples = {
    scan: [
      'scan --repo-url=https://github.com/user/repo',
      'scan --repo-url=https://github.com/user/repo --depth=deep'
    ],
    map: [
      'map --repo-id=1',
      'map --repo-id=1 --format=mermaid'
    ],
    'init-project': [
      'init-project --name="My Web App" --type=web-app',
      'init-project --name="Mobile App" --type=mobile-app --template=advanced'
    ]
  };
  return examples[command] || [];
}

function getDefaultFeatures(type) {
  const features = {
    'web-app': ['authentication', 'database', 'api'],
    'mobile-app': ['authentication', 'api'],
    'api': ['authentication', 'documentation'],
    'cli': ['authentication', 'database']
  };
  return features[type] || [];
}

function generateMermaidArchitecture(patterns) {
  let mermaid = 'graph TB\n';
  
  patterns.forEach((pattern, index) => {
    mermaid += `  P${index}[${pattern.pattern_name}]\n`;
  });
  
  return mermaid;
}

function generateRecommendations(repo, dependencies) {
  const recommendations = [];
  
  if (dependencies.filter(d => d.is_outdated).length > 5) {
    recommendations.push({
      type: 'dependencies',
      priority: 'high',
      message: 'Multiple outdated dependencies found. Consider updating them.',
      count: dependencies.filter(d => d.is_outdated).length
    });
  }
  
  if (dependencies.filter(d => d.security_vulnerability).length > 0) {
    recommendations.push({
      type: 'security',
      priority: 'critical',
      message: 'Security vulnerabilities detected in dependencies.',
      count: dependencies.filter(d => d.security_vulnerability).length
    });
  }
  
  if (!repo.last_scanned || new Date(repo.last_scanned) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
    recommendations.push({
      type: 'maintenance',
      priority: 'medium',
      message: 'Repository has not been scanned recently.'
    });
  }
  
  return recommendations;
}

function calculateSuccessRate(rows) {
  const total = rows.reduce((sum, row) => sum + parseInt(row.total_tasks), 0);
  const completed = rows.reduce((sum, row) => sum + parseInt(row.completed), 0);
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

async function performSecurityAnalysis(repoId) {
  // Mock security analysis
  return {
    vulnerabilities: Math.floor(Math.random() * 10),
    security_score: 70 + Math.floor(Math.random() * 30),
    recommendations: [
      'Update vulnerable dependencies',
      'Enable security headers',
      'Implement input validation'
    ]
  };
}

async function performPerformanceAnalysis(repoId) {
  // Mock performance analysis
  return {
    performance_score: 75 + Math.floor(Math.random() * 25),
    bottlenecks: [
      'Database query optimization needed',
      'Consider caching frequently accessed data'
    ],
    recommendations: [
      'Optimize database queries',
      'Implement caching strategy',
      'Enable compression'
    ]
  };
}

async function performArchitectureAnalysis(repoId) {
  // Mock architecture analysis
  return {
    patterns_found: 5,
    complexity_score: Math.floor(Math.random() * 100),
    recommendations: [
      'Consider refactoring large classes',
      'Implement dependency injection',
      'Add design patterns for better maintainability'
    ]
  };
}

async function performComprehensiveAnalysis(repoId) {
  return {
    security: await performSecurityAnalysis(repoId),
    performance: await performPerformanceAnalysis(repoId),
    architecture: await performArchitectureAnalysis(repoId),
    overall_score: 75 + Math.floor(Math.random() * 20)
  };
}

async function checkMaintenanceNeeds(repoId) {
  // Mock maintenance check
  return [
    {
      type: 'dependency_update',
      priority: 'medium',
      description: '5 outdated dependencies found'
    },
    {
      type: 'documentation',
      priority: 'low',
      description: 'README needs updating'
    }
  ];
}

async function getMonitoringData(duration, metrics) {
  // Mock monitoring data
  return {
    system_health: {
      cpu_usage: Math.random() * 100,
      memory_usage: Math.random() * 100,
      disk_usage: Math.random() * 100,
      uptime: process.uptime()
    },
    agent_status: {
      total_agents: 3,
      active_agents: 2,
      tasks_running: 4
    },
    api_metrics: {
      requests_per_minute: Math.floor(Math.random() * 100),
      average_response_time: Math.random() * 500,
      error_rate: Math.random() * 5
    }
  };
}

async function exportRepositories(repoId) {
  let query = 'SELECT * FROM repositories';
  const params = [];
  
  if (repoId) {
    query += ' WHERE id = $1';
    params.push(repoId);
  }
  
  const result = await pool.query(query, params);
  return { repositories: result.rows };
}

async function exportAgents() {
  const result = await pool.query(`
    SELECT 
      agent_name,
      COUNT(*) as total_tasks,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      MAX(created_at) as last_activity
    FROM agent_tasks
    GROUP BY agent_name
  `);
  
  return { agents: result.rows };
}

async function exportTasks() {
  const result = await pool.query(
    'SELECT * FROM agent_tasks ORDER BY created_at DESC LIMIT 100'
  );
  
  return { tasks: result.rows };
}

async function exportOverview() {
  const repoStats = await pool.query('SELECT COUNT(*) as total FROM repositories');
  const taskStats = await pool.query('SELECT COUNT(*) as total FROM agent_tasks');
  
  return {
    repositories: repoStats.rows[0],
    tasks: taskStats.rows[0],
    generated_at: new Date().toISOString()
  };
}

module.exports = router;