const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('./auth');
const router = express.Router();

// Get all prompts
router.get('/prompts', authenticateToken, async (req, res) => {
  try {
    const { category, active_only = false } = req.query;
    
    let query = 'SELECT * FROM prompts';
    const params = [];
    
    if (category || active_only) {
      query += ' WHERE';
      const conditions = [];
      
      if (category) {
        conditions.push(`category = $${params.length + 1}`);
        params.push(category);
      }
      
      if (active_only === 'true') {
        conditions.push(`is_active = $${params.length + 1}`);
        params.push(true);
      }
      
      query += ' ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json({ prompts: result.rows });
  } catch (error) {
    console.error('Get prompts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get prompt by ID
router.get('/prompts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM prompts WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    res.json({ prompt: result.rows[0] });
  } catch (error) {
    console.error('Get prompt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new prompt
router.post('/prompts', authenticateToken, async (req, res) => {
  try {
    const { name, content, category, version = 1, is_active = true } = req.body;
    
    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }
    
    const result = await pool.query(
      `INSERT INTO prompts (name, content, category, version, is_active, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [name, content, category, version, is_active, req.user.userId]
    );
    
    res.status(201).json({
      message: 'Prompt created successfully',
      prompt: result.rows[0]
    });
  } catch (error) {
    console.error('Create prompt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update prompt
router.put('/prompts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content, category, is_active } = req.body;
    
    const result = await pool.query(
      `UPDATE prompts 
       SET name = $1, content = $2, category = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [name, content, category, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    res.json({
      message: 'Prompt updated successfully',
      prompt: result.rows[0]
    });
  } catch (error) {
    console.error('Update prompt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new version of prompt
router.post('/prompts/:id/version', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, changes } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Get original prompt
    const originalResult = await pool.query('SELECT * FROM prompts WHERE id = $1', [id]);
    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    const original = originalResult.rows[0];
    
    // Get next version number
    const versionResult = await pool.query(
      'SELECT MAX(version) as max_version FROM prompts WHERE name = $1',
      [original.name]
    );
    const nextVersion = (versionResult.rows[0].max_version || 0) + 1;
    
    // Deactivate old version
    await pool.query('UPDATE prompts SET is_active = false WHERE name = $1', [original.name]);
    
    // Create new version
    const result = await pool.query(
      `INSERT INTO prompts (name, content, category, version, is_active, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [original.name, content, original.category, nextVersion, true, req.user.userId]
    );
    
    res.status(201).json({
      message: 'New prompt version created successfully',
      prompt: result.rows[0]
    });
  } catch (error) {
    console.error('Create prompt version error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get prompt versions
router.get('/prompts/:id/versions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get prompt name
    const promptResult = await pool.query('SELECT name FROM prompts WHERE id = $1', [id]);
    if (promptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    const name = promptResult.rows[0].name;
    
    // Get all versions
    const versionsResult = await pool.query(
      'SELECT * FROM prompts WHERE name = $1 ORDER BY version DESC',
      [name]
    );
    
    res.json({ versions: versionsResult.rows });
  } catch (error) {
    console.error('Get prompt versions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete prompt
router.delete('/prompts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM prompts WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    res.json({ message: 'Prompt deleted successfully' });
  } catch (error) {
    console.error('Delete prompt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get prompt categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT category FROM prompts WHERE category IS NOT NULL ORDER BY category'
    );
    
    res.json({ 
      categories: result.rows.map(row => row.category)
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search prompts
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: query, category } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    let sql = `
      SELECT * FROM prompts 
      WHERE (name ILIKE $1 OR content ILIKE $1)
    `;
    const params = [`%${query}%`];
    
    if (category) {
      sql += ' AND category = $2';
      params.push(category);
    }
    
    sql += ' ORDER BY name';
    
    const result = await pool.query(sql, params);
    res.json({ prompts: result.rows });
  } catch (error) {
    console.error('Search prompts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Node roles management

// Get all node roles
router.get('/roles', authenticateToken, async (req, res) => {
  try {
    // For now, return static node roles
    // In production, this would come from database
    const roles = [
      {
        id: 'prometheus',
        name: 'Prometheus',
        description: 'Security and monitoring specialist',
        capabilities: ['security_analysis', 'monitoring', 'alerting'],
        status: 'active'
      },
      {
        id: 'ninja',
        name: 'Ninja',
        description: 'Full-stack development and automation',
        capabilities: ['development', 'automation', 'deployment'],
        status: 'active'
      },
      {
        id: 'grok',
        name: 'Grok',
        description: 'Data analysis and insights',
        capabilities: ['data_analysis', 'machine_learning', 'visualization'],
        status: 'active'
      }
    ];
    
    res.json({ roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get node role by ID
router.get('/roles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock role data
    const roles = {
      prometheus: {
        id: 'prometheus',
        name: 'Prometheus',
        description: 'Security and monitoring specialist',
        capabilities: ['security_analysis', 'monitoring', 'alerting'],
        prompts: ['security_scan', 'vulnerability_assessment', 'performance_monitoring'],
        configuration: {
          scan_interval: 'hourly',
          alert_threshold: 0.8,
          log_level: 'info'
        },
        status: 'active'
      },
      ninja: {
        id: 'ninja',
        name: 'Ninja',
        description: 'Full-stack development and automation',
        capabilities: ['development', 'automation', 'deployment'],
        prompts: ['code_generation', 'project_setup', 'deployment'],
        configuration: {
          auto_deploy: true,
          test_coverage_threshold: 80,
          preferred_language: 'javascript'
        },
        status: 'active'
      },
      grok: {
        id: 'grok',
        name: 'Grok',
        description: 'Data analysis and insights',
        capabilities: ['data_analysis', 'machine_learning', 'visualization'],
        prompts: ['data_analysis', 'pattern_recognition', 'insight_generation'],
        configuration: {
          model: 'gpt-4',
          analysis_depth: 'deep',
          visualization_library: 'd3.js'
        },
        status: 'active'
      }
    };
    
    const role = roles[id];
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    res.json({ role });
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update node role
router.put('/roles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, capabilities, configuration, status } = req.body;
    
    // In production, this would update database
    // For now, just return success
    res.json({
      message: 'Role updated successfully',
      role: {
        id,
        name,
        description,
        capabilities,
        configuration,
        status,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Memory artifacts management

// Get memory artifacts
router.get('/artifacts', authenticateToken, async (req, res) => {
  try {
    const { node_id, type, limit = 50 } = req.query;
    
    let query = 'SELECT * FROM memory_artifacts WHERE 1=1';
    const params = [];
    
    if (node_id) {
      query += ` AND node_id = $${params.length + 1}`;
      params.push(node_id);
    }
    
    if (type) {
      query += ` AND type = $${params.length + 1}`;
      params.push(type);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    
    // For now, return mock data
    const artifacts = [
      {
        id: 1,
        node_id: 'ninja',
        type: 'code_analysis',
        name: 'Repository Scan Results',
        description: 'Analysis of main repository structure and patterns',
        data: {
          files_analyzed: 150,
          patterns_found: 5,
          recommendations: 3
        },
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        node_id: 'prometheus',
        type: 'security_report',
        name: 'Security Vulnerability Assessment',
        description: 'Latest security scan results and recommendations',
        data: {
          vulnerabilities_found: 2,
          critical_issues: 0,
          scan_duration: '45s'
        },
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ];
    
    res.json({ artifacts });
  } catch (error) {
    console.error('Get artifacts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create memory artifact
router.post('/artifacts', authenticateToken, async (req, res) => {
  try {
    const { node_id, type, name, description, data } = req.body;
    
    if (!node_id || !type || !name || !data) {
      return res.status(400).json({ error: 'Node ID, type, name, and data are required' });
    }
    
    // In production, this would insert into database
    const artifact = {
      id: Date.now(),
      node_id,
      type,
      name,
      description,
      data,
      created_by: req.user.userId,
      created_at: new Date().toISOString()
    };
    
    res.status(201).json({
      message: 'Memory artifact created successfully',
      artifact
    });
  } catch (error) {
    console.error('Create artifact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get memory artifact by ID
router.get('/artifacts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock artifact retrieval
    const artifact = {
      id: parseInt(id),
      node_id: 'ninja',
      type: 'code_analysis',
      name: 'Repository Scan Results',
      description: 'Detailed analysis of repository structure and patterns',
      data: {
        files_analyzed: 150,
        patterns_found: 5,
        recommendations: 3,
        detailed_findings: [
          {
            type: 'pattern',
            name: 'Repository Pattern',
            files: ['src/repositories/UserRepository.js', 'src/repositories/ProductRepository.js'],
            confidence: 0.85
          },
          {
            type: 'issue',
            name: 'Duplicate Code',
            files: ['src/utils/validation.js', 'src/helpers/validation.js'],
            severity: 'medium'
          }
        ]
      },
      created_at: new Date().toISOString()
    };
    
    res.json({ artifact });
  } catch (error) {
    console.error('Get artifact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Alignment rules management

// Get alignment rules
router.get('/alignment', authenticateToken, async (req, res) => {
  try {
    // Mock alignment rules
    const rules = [
      {
        id: 1,
        name: 'Code Quality Standards',
        description: 'Minimum code quality requirements for all generated code',
        type: 'code_quality',
        rules: {
          test_coverage_minimum: 80,
          max_function_length: 50,
          require_documentation: true,
          security_scan_required: true
        },
        active: true
      },
      {
        id: 2,
        name: 'Security Guidelines',
        description: 'Security requirements for all operations',
        type: 'security',
        rules: {
          encrypt_sensitive_data: true,
          validate_all_inputs: true,
          use_https_only: true,
          audit_logging_required: true
        },
        active: true
      },
      {
        id: 3,
        name: 'Performance Standards',
        description: 'Performance requirements for generated solutions',
        type: 'performance',
        rules: {
          max_response_time: 2000,
          memory_usage_limit: '512MB',
          concurrent_users_minimum: 100,
          caching_required: true
        },
        active: true
      }
    ];
    
    res.json({ rules });
  } catch (error) {
    console.error('Get alignment rules error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update alignment rule
router.put('/alignment/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, type, rules, active } = req.body;
    
    // In production, this would update database
    res.json({
      message: 'Alignment rule updated successfully',
      rule: {
        id: parseInt(id),
        name,
        description,
        type,
        rules,
        active,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Update alignment rule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export prompts and configurations
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { format = 'json', include_inactive = false } = req.query;
    
    // Get all prompts
    const promptsResult = await pool.query(
      `SELECT * FROM prompts ${include_inactive !== 'true' ? 'WHERE is_active = true' : ''} ORDER BY name`
    );
    
    // Get node roles
    const roles = [
      {
        id: 'prometheus',
        name: 'Prometheus',
        description: 'Security and monitoring specialist',
        capabilities: ['security_analysis', 'monitoring', 'alerting'],
        status: 'active'
      },
      {
        id: 'ninja',
        name: 'Ninja',
        description: 'Full-stack development and automation',
        capabilities: ['development', 'automation', 'deployment'],
        status: 'active'
      }
    ];
    
    const exportData = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      exported_by: req.user.username,
      prompts: promptsResult.rows,
      roles,
      alignment_rules: [
        {
          id: 1,
          name: 'Code Quality Standards',
          description: 'Minimum code quality requirements',
          active: true
        }
      ]
    };
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="nogaslabs-registry-export-${Date.now()}.json"`);
      res.json(exportData);
    } else if (format === 'yaml') {
      const yaml = require('js-yaml');
      res.setHeader('Content-Type', 'text/yaml');
      res.setHeader('Content-Disposition', `attachment; filename="nogaslabs-registry-export-${Date.now()}.yaml"`);
      res.send(yaml.dump(exportData));
    } else {
      res.status(400).json({ error: 'Invalid format. Use json or yaml' });
    }
  } catch (error) {
    console.error('Export registry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import prompts and configurations
router.post('/import', authenticateToken, async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: 'Import data is required' });
    }
    
    let importedCount = 0;
    let errors = [];
    
    // Import prompts
    if (data.prompts && Array.isArray(data.prompts)) {
      for (const prompt of data.prompts) {
        try {
          await pool.query(
            `INSERT INTO prompts (name, content, category, version, is_active, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             ON CONFLICT (name, version) DO NOTHING`,
            [
              prompt.name,
              prompt.content,
              prompt.category,
              prompt.version || 1,
              prompt.is_active !== false,
              req.user.userId
            ]
          );
          importedCount++;
        } catch (error) {
          errors.push(`Failed to import prompt "${prompt.name}": ${error.message}`);
        }
      }
    }
    
    res.json({
      message: 'Import completed',
      imported_count: importedCount,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    console.error('Import registry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;