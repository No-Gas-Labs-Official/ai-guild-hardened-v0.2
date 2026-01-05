const express = require('express');
const { Octokit } = require('@octokit/rest');
const { pool, redis } = require('../config/database');
const { authenticateToken } = require('./auth');
const cron = require('node-cron');
const axios = require('axios');
const router = express.Router();

// Initialize GitHub client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || 'GITHUB_TOKEN_REMOVED'
});

// Scheduled repository scanning
cron.schedule('0 */6 * * *', async () => {
  console.log('🔄 Starting scheduled repository scan...');
  await scanAllRepositories();
});

// Scan all repositories
const scanAllRepositories = async () => {
  try {
    // Get all repositories from database
    const reposResult = await pool.query('SELECT * FROM repositories');
    
    for (const repo of reposResult.rows) {
      await scanRepository(repo.id, repo.owner, repo.name);
    }
    
    console.log('✅ Repository scan completed');
  } catch (error) {
    console.error('❌ Repository scan failed:', error);
  }
};

// Scan individual repository
const scanRepository = async (repoId, owner, repoName) => {
  try {
    // Cache key for this repository
    const cacheKey = `repo:${owner}/${repoName}`;
    
    // Check cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp < 3600000) { // 1 hour cache
        return data.data;
      }
    }

    // Get repository information
    const { data: repo } = await octokit.repos.get({
      owner,
      repo: repoName
    });

    // Get commits (last 100)
    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo: repoName,
      per_page: 100
    });

    // Get branches
    const { data: branches } = await octokit.repos.listBranches({
      owner,
      repo: repoName
    });

    // Get contributors
    const { data: contributors } = await octokit.repos.listContributors({
      owner,
      repo: repoName
    });

    // Get languages
    const { data: languages } = await octokit.repos.listLanguages({
      owner,
      repo: repoName
    });

    // Get package.json for dependencies (if applicable)
    let dependencies = [];
    try {
      const { data: packageContent } = await octokit.repos.getContent({
        owner,
        repo: repoName,
        path: 'package.json'
      });
      
      if (packageContent.content) {
        const packageJson = JSON.parse(Buffer.from(packageContent.content, 'base64').toString());
        dependencies = Object.entries(packageJson.dependencies || {}).map(([name, version]) => ({
          name,
          version,
          type: 'runtime'
        }));
        
        // Add dev dependencies
        Object.entries(packageJson.devDependencies || {}).forEach(([name, version]) => {
          dependencies.push({ name, version, type: 'dev' });
        });
      }
    } catch (error) {
      // No package.json found
    }

    // Check for stale dependencies
    const staleDependencies = await checkStaleDependencies(dependencies);

    // Analyze commit activity trends
    const activityTrends = analyzeActivityTrends(commits);

    // Extract metadata
    const metadata = {
      totalCommits: commits.length,
      totalBranches: branches.length,
      totalContributors: contributors.length,
      languages,
      activityTrends,
      lastCommit: commits[0]?.sha,
      contributors: contributors.map(c => ({
        login: c.login,
        contributions: c.contributions,
        type: c.type
      }))
    };

    // Update repository in database
    await pool.query(
      `UPDATE repositories 
       SET 
         description = $1, 
         language = $2, 
         stars = $3, 
         forks = $4,
         last_scanned = CURRENT_TIMESTAMP,
         metadata = $5
       WHERE id = $6`,
      [
        repo.description,
        repo.language,
        repo.stargazers_count,
        repo.forks_count,
        metadata,
        repoId
      ]
    );

    // Store commits
    for (const commit of commits.slice(0, 50)) { // Store last 50 commits
      await pool.query(
        `INSERT INTO commits (repo_id, commit_hash, author, message, timestamp, files_changed, additions, deletions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (repo_id, commit_hash) DO NOTHING`,
        [
          repoId,
          commit.sha,
          commit.commit.author.name,
          commit.commit.message,
          commit.commit.author.date,
          commit.stats?.files_changed || 0,
          commit.stats?.additions || 0,
          commit.stats?.deletions || 0
        ]
      );
    }

    // Store dependencies
    for (const dep of dependencies) {
      const staleInfo = staleDependencies.find(d => d.name === dep.name);
      await pool.query(
        `INSERT INTO dependencies (repo_id, name, version, type, is_outdated, latest_version, security_vulnerability)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (repo_id, name) DO UPDATE SET
           version = EXCLUDED.version,
           is_outdated = EXCLUDED.is_outdated,
           latest_version = EXCLUDED.latest_version,
           security_vulnerability = EXCLUDED.security_vulnerability`,
        [
          repoId,
          dep.name,
          dep.version,
          dep.type,
          staleInfo?.isOutdated || false,
          staleInfo?.latestVersion || null,
          staleInfo?.hasVulnerability || false
        ]
      );
    }

    const result = {
      repo,
      metadata,
      dependencies: staleDependencies,
      activityTrends
    };

    // Cache the result
    await redis.setex(cacheKey, 3600, JSON.stringify({
      timestamp: Date.now(),
      data: result
    }));

    return result;
  } catch (error) {
    console.error(`Error scanning repository ${owner}/${repoName}:`, error);
    throw error;
  }
};

// Check for stale dependencies
const checkStaleDependencies = async (dependencies) => {
  const results = [];
  
  for (const dep of dependencies.slice(0, 20)) { // Limit to avoid rate limiting
    try {
      const response = await axios.get(`https://registry.npmjs.org/${dep.name}`);
      const latestVersion = response.data['dist-tags']?.latest;
      const isOutdated = latestVersion && latestVersion !== dep.version.replace(/^[\^~]/, '');
      
      results.push({
        name: dep.name,
        currentVersion: dep.version,
        latestVersion,
        isOutdated,
        hasVulnerability: false // Would need to integrate with security advisories
      });
    } catch (error) {
      results.push({
        name: dep.name,
        currentVersion: dep.version,
        latestVersion: null,
        isOutdated: false,
        hasVulnerability: false
      });
    }
  }
  
  return results;
};

// Analyze activity trends
const analyzeActivityTrends = (commits) => {
  const now = new Date();
  const lastDay = commits.filter(c => new Date(c.commit.author.date) > new Date(now - 24 * 60 * 60 * 1000)).length;
  const lastWeek = commits.filter(c => new Date(c.commit.author.date) > new Date(now - 7 * 24 * 60 * 60 * 1000)).length;
  const lastMonth = commits.filter(c => new Date(c.commit.author.date) > new Date(now - 30 * 24 * 60 * 60 * 1000)).length;
  
  return {
    lastDay,
    lastWeek,
    lastMonth,
    activityScore: lastDay * 10 + lastWeek * 2 + lastMonth * 0.5
  };
};

// API Routes

// Add repository to monitoring
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }
    
    // Parse GitHub URL
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid GitHub repository URL' });
    }
    
    const [, owner, repoName] = match;
    
    // Check if repository already exists
    const existing = await pool.query(
      'SELECT id FROM repositories WHERE owner = $1 AND name = $2',
      [owner, repoName]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Repository already being monitored' });
    }
    
    // Add repository to database
    const result = await pool.query(
      'INSERT INTO repositories (name, url, owner) VALUES ($1, $2, $3) RETURNING *',
      [repoName, url, owner]
    );
    
    // Start initial scan
    scanRepository(result.rows[0].id, owner, repoName).catch(console.error);
    
    res.status(201).json({
      message: 'Repository added successfully',
      repository: result.rows[0]
    });
  } catch (error) {
    console.error('Add repository error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all repositories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM repositories ORDER BY last_scanned DESC NULLS LAST');
    res.json({ repositories: result.rows });
  } catch (error) {
    console.error('Get repositories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get repository details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const repoResult = await pool.query('SELECT * FROM repositories WHERE id = $1', [id]);
    if (repoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    const repo = repoResult.rows[0];
    
    // Get commits
    const commitsResult = await pool.query(
      'SELECT * FROM commits WHERE repo_id = $1 ORDER BY timestamp DESC LIMIT 50',
      [id]
    );
    
    // Get dependencies
    const depsResult = await pool.query(
      'SELECT * FROM dependencies WHERE repo_id = $1 ORDER BY name',
      [id]
    );
    
    res.json({
      repository: repo,
      commits: commitsResult.rows,
      dependencies: depsResult.rows
    });
  } catch (error) {
    console.error('Get repository error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trigger manual scan
router.post('/:id/scan', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const repoResult = await pool.query('SELECT * FROM repositories WHERE id = $1', [id]);
    if (repoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    const repo = repoResult.rows[0];
    
    // Start scan in background
    scanRepository(repo.id, repo.owner, repo.name).catch(console.error);
    
    res.json({ message: 'Repository scan started' });
  } catch (error) {
    console.error('Scan repository error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get dependency graph data
router.get('/:id/dependencies/graph', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const depsResult = await pool.query(
      'SELECT * FROM dependencies WHERE repo_id = $1 ORDER BY name',
      [id]
    );
    
    // Build dependency graph
    const nodes = depsResult.rows.map(dep => ({
      id: dep.name,
      label: dep.name,
      version: dep.version,
      type: dep.type,
      outdated: dep.is_outdated,
      vulnerability: dep.security_vulnerability
    }));
    
    const links = []; // Would need more sophisticated analysis for actual dependencies
    
    res.json({ nodes, links });
  } catch (error) {
    console.error('Get dependency graph error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;