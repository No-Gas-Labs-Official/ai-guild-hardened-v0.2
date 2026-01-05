const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('./auth');
const simpleGit = require('simple-git');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Architecture pattern detection rules
const ARCHITECTURE_PATTERNS = {
  MVC: {
    files: ['controllers/', 'models/', 'views/', 'routes/'],
    keywords: ['controller', 'model', 'view', 'route'],
    description: 'Model-View-Controller pattern'
  },
  Microservices: {
    files: ['service/', 'services/', 'api/', 'gateway/'],
    keywords: ['service', 'microservice', 'gateway', 'api'],
    description: 'Microservices architecture'
  },
  Layered: {
    files: ['layers/', 'tiers/', 'dal/', 'bll/'],
    keywords: ['layer', 'tier', 'dataaccess', 'business'],
    description: 'Layered architecture'
  },
  Repository: {
    files: ['repository/', 'repositories/', 'data/'],
    keywords: ['repository', 'data', 'persistence'],
    description: 'Repository pattern'
  },
  Factory: {
    files: ['factory/', 'factories/'],
    keywords: ['factory', 'create', 'build'],
    description: 'Factory pattern'
  },
  Observer: {
    files: ['observer/', 'events/', 'listeners/'],
    keywords: ['observer', 'event', 'listener', 'subscribe'],
    description: 'Observer pattern'
  },
  Singleton: {
    keywords: ['singleton', 'getInstance', 'instance'],
    description: 'Singleton pattern'
  },
  Strategy: {
    files: ['strategy/', 'strategies/'],
    keywords: ['strategy', 'algorithm', 'context'],
    description: 'Strategy pattern'
  }
};

// Analyze repository architecture
const analyzeArchitecture = async (repoId, repoPath) => {
  try {
    const patterns = [];
    const filesAnalyzed = [];
    
    // Get all files in repository
    const files = await getAllFiles(repoPath);
    
    // Analyze each pattern
    for (const [patternName, patternConfig] of Object.entries(ARCHITECTURE_PATTERNS)) {
      const patternAnalysis = await analyzePattern(repoPath, files, patternName, patternConfig);
      if (patternAnalysis.found) {
        patterns.push(patternAnalysis);
        filesAnalyzed.push(...patternAnalysis.filesAffected);
      }
    }
    
    // Generate UML diagram data
    const umlData = await generateUMLData(repoPath, files);
    
    // Identify refactoring opportunities
    const refactoringOpportunities = await identifyRefactoringOpportunities(repoPath, files, patterns);
    
    // Store patterns in database
    for (const pattern of patterns) {
      await pool.query(
        `INSERT INTO architecture_patterns (repo_id, pattern_type, pattern_name, description, files_affected, confidence_score)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (repo_id, pattern_name) DO UPDATE SET
           description = EXCLUDED.description,
           files_affected = EXCLUDED.files_affected,
           confidence_score = EXCLUDED.confidence_score`,
        [
          repoId,
          pattern.type,
          pattern.name,
          pattern.description,
          pattern.filesAffected,
          pattern.confidence
        ]
      );
    }
    
    return {
      patterns,
      umlData,
      refactoringOpportunities,
      totalFilesAnalyzed: files.length
    };
  } catch (error) {
    console.error('Architecture analysis error:', error);
    throw error;
  }
};

// Get all files in directory recursively
const getAllFiles = async (dir, fileList = []) => {
  try {
    const files = await fs.readdir(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        await getAllFiles(filePath, fileList);
      } else if (stat.isFile() && isCodeFile(file)) {
        fileList.push(filePath);
      }
    }
  } catch (error) {
    // Handle permission errors
  }
  
  return fileList;
};

// Check if file is a code file
const isCodeFile = (filename) => {
  const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs'];
  return codeExtensions.some(ext => filename.endsWith(ext));
};

// Analyze specific pattern
const analyzePattern = async (repoPath, files, patternName, patternConfig) => {
  const foundFiles = [];
  let keywordMatches = 0;
  
  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const relativePath = path.relative(repoPath, filePath);
      
      // Check file paths
      let pathMatch = false;
      if (patternConfig.files) {
        pathMatch = patternConfig.files.some(filePattern => 
          relativePath.includes(filePattern)
        );
      }
      
      // Check keywords
      let keywordMatch = false;
      if (patternConfig.keywords) {
        keywordMatch = patternConfig.keywords.some(keyword =>
          content.toLowerCase().includes(keyword.toLowerCase()) ||
          relativePath.toLowerCase().includes(keyword.toLowerCase())
        );
        if (keywordMatch) keywordMatches++;
      }
      
      if (pathMatch || keywordMatch) {
        foundFiles.push(relativePath);
      }
    } catch (error) {
      // Handle file read errors
    }
  }
  
  const confidence = files.length > 0 ? foundFiles.length / files.length : 0;
  
  return {
    type: patternName,
    name: `${patternName} Pattern`,
    description: patternConfig.description,
    found: foundFiles.length > 0,
    filesAffected: foundFiles,
    confidence: Math.min(confidence * 2, 1), // Scale confidence
    keywordMatches
  };
};

// Generate UML diagram data
const generateUMLData = async (repoPath, files) => {
  const classes = [];
  const relationships = [];
  
  for (const filePath of files.slice(0, 50)) { // Limit to avoid too much data
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const relativePath = path.relative(repoPath, filePath);
      const ext = path.extname(filePath);
      
      let classInfo = null;
      
      if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
        classInfo = parseJavaScriptClass(content, relativePath);
      } else if (['.py'].includes(ext)) {
        classInfo = parsePythonClass(content, relativePath);
      } else if (['.java'].includes(ext)) {
        classInfo = parseJavaClass(content, relativePath);
      }
      
      if (classInfo) {
        classes.push(classInfo);
        
        // Analyze relationships
        const relationshipsFromFile = analyzeRelationships(content, classInfo.name);
        relationships.push(...relationshipsFromFile);
      }
    } catch (error) {
      // Handle file parse errors
    }
  }
  
  // Generate Mermaid UML
  const mermaidUML = generateMermaidUML(classes, relationships);
  
  return {
    classes,
    relationships,
    mermaidUML
  };
};

// Parse JavaScript/TypeScript class
const parseJavaScriptClass = (content, filePath) => {
  const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?\s*{([^}]*)}/g;
  const functionRegex = /(?:function\s+(\w+)|(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>)|(\w+)\s*\([^)]*\)\s*{)/g;
  
  const matches = [...content.matchAll(classRegex)];
  
  if (matches.length === 0) {
    // Check for function exports (module pattern)
    const exportMatches = content.match(/exports\.(\w+)|module\.exports\s*=\s*{([^}]+)}/g);
    if (exportMatches) {
      const moduleName = path.basename(filePath, path.extname(filePath));
      return {
        name: moduleName,
        type: 'Module',
        methods: [],
        properties: [],
        file: filePath
      };
    }
    return null;
  }
  
  const classes = matches.map(match => {
    const className = match[1];
    const parentClass = match[2];
    const classBody = match[3];
    
    const methods = [...classBody.matchAll(functionRegex)]
      .map(m => m[1] || m[2] || m[3])
      .filter(Boolean);
    
    return {
      name: className,
      type: 'Class',
      parent: parentClass,
      methods,
      properties: [],
      file: filePath
    };
  });
  
  return classes[0]; // Return first class found
};

// Parse Python class
const parsePythonClass = (content, filePath) => {
  const classRegex = /class\s+(\w+)(?:\s*\(\s*([^)]+)\s*\))?\s*:/g;
  const methodRegex = /def\s+(\w+)\s*\([^)]*\):/g;
  
  const matches = [...content.matchAll(classRegex)];
  
  if (matches.length === 0) return null;
  
  const match = matches[0];
  const className = match[1];
  const parentClass = match[2];
  
  // Find methods in the class (simplified)
  const classStart = content.indexOf(match[0]);
  const nextClassStart = content.indexOf('class ', classStart + 1);
  const classEnd = nextClassStart !== -1 ? nextClassStart : content.length;
  const classContent = content.substring(classStart, classEnd);
  
  const methods = [...classContent.matchAll(methodRegex)]
    .map(m => m[1])
    .filter(name => name !== 'init' && !name.startsWith('_'));
  
  return {
    name: className,
    type: 'Class',
    parent: parentClass,
    methods,
    properties: [],
    file: filePath
  };
};

// Parse Java class
const parseJavaClass = (content, filePath) => {
  const classRegex = /(?:public\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?{/g;
  const methodRegex = /(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)?(\w+)\s*\([^)]*\)\s*(?:throws\s+[^{]+)?{/g;
  
  const matches = [...content.matchAll(classRegex)];
  
  if (matches.length === 0) return null;
  
  const match = matches[0];
  const className = match[1];
  const parentClass = match[2];
  const interfaces = match[3]?.split(',').map(i => i.trim()) || [];
  
  const methods = [...content.matchAll(methodRegex)]
    .map(m => m[1])
    .filter(name => !name.equals(className));
  
  return {
    name: className,
    type: 'Class',
    parent: parentClass,
    interfaces,
    methods,
    properties: [],
    file: filePath
  };
};

// Analyze relationships between classes
const analyzeRelationships = (content, className) => {
  const relationships = [];
  
  // Find imports and requires
  const imports = content.match(/(?:import\s+.*from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g) || [];
  
  for (const imp of imports) {
    const match = imp.match(/['"]([^'"]+)['"]/);
    if (match) {
      const importedModule = match[1];
      relationships.push({
        from: className,
        to: importedModule,
        type: 'dependency'
      });
    }
  }
  
  return relationships;
};

// Generate Mermaid UML diagram
const generateMermaidUML = (classes, relationships) => {
  let uml = 'classDiagram\n';
  
  // Add classes
  for (const cls of classes) {
    uml += `  class ${cls.name} {\n`;
    for (const method of cls.methods) {
      uml += `    +${method}()\n`;
    }
    uml += '  }\n';
  }
  
  // Add relationships
  for (const rel of relationships) {
    if (rel.type === 'dependency') {
      uml += `  ${rel.from} ..> ${rel.to} : uses\n`;
    } else if (rel.type === 'inheritance') {
      uml += `  ${rel.from} --|> ${rel.to} : extends\n`;
    }
  }
  
  return uml;
};

// Identify refactoring opportunities
const identifyRefactoringOpportunities = async (repoPath, files, patterns) => {
  const opportunities = [];
  
  // Check for duplicate code
  const duplicateCode = await findDuplicateCode(repoPath, files);
  if (duplicateCode.length > 0) {
    opportunities.push({
      type: 'Duplicate Code',
      description: 'Found duplicate code blocks that could be refactored',
      severity: 'medium',
      files: duplicateCode
    });
  }
  
  // Check for long methods
  const longMethods = await findLongMethods(repoPath, files);
  if (longMethods.length > 0) {
    opportunities.push({
      type: 'Long Methods',
      description: 'Found methods that are too long and could be broken down',
      severity: 'low',
      files: longMethods
    });
  }
  
  // Check for large classes
  const largeClasses = await findLargeClasses(repoPath, files);
  if (largeClasses.length > 0) {
    opportunities.push({
      type: 'Large Classes',
      description: 'Found classes with too many responsibilities',
      severity: 'medium',
      files: largeClasses
    });
  }
  
  return opportunities;
};

// Find duplicate code (simplified)
const findDuplicateCode = async (repoPath, files) => {
  const codeBlocks = new Map();
  const duplicates = [];
  
  for (const filePath of files.slice(0, 20)) { // Limit files
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Check for blocks of 5+ similar lines
      for (let i = 0; i < lines.length - 5; i++) {
        const block = lines.slice(i, i + 5).join('\n').trim();
        if (block.length > 50) { // Ignore very small blocks
          if (codeBlocks.has(block)) {
            duplicates.push(path.relative(repoPath, filePath));
          } else {
            codeBlocks.set(block, path.relative(repoPath, filePath));
          }
        }
      }
    } catch (error) {
      // Handle file read errors
    }
  }
  
  return [...new Set(duplicates)];
};

// Find long methods
const findLongMethods = async (repoPath, files) => {
  const longMethods = [];
  
  for (const filePath of files.slice(0, 30)) { // Limit files
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Simple heuristic for method length (very basic)
      let inMethod = false;
      let methodStart = 0;
      let braceCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes('function') || line.includes('def ') || line.includes('{')) {
          inMethod = true;
          methodStart = i;
        }
        
        if (inMethod) {
          braceCount += (line.match(/{/g) || []).length;
          braceCount -= (line.match(/}/g) || []).length;
          
          if (braceCount <= 0 && (line.includes('}') || line.trim() === '')) {
            const methodLength = i - methodStart;
            if (methodLength > 30) { // Consider methods over 30 lines as long
              longMethods.push(path.relative(repoPath, filePath));
            }
            inMethod = false;
            braceCount = 0;
          }
        }
      }
    } catch (error) {
      // Handle file read errors
    }
  }
  
  return [...new Set(longMethods)];
};

// Find large classes
const findLargeClasses = async (repoPath, files) => {
  const largeClasses = [];
  
  for (const filePath of files.slice(0, 30)) { // Limit files
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Count methods and properties
      const methodCount = (content.match(/function\s+\w+|def\s+\w+|^\s*\w+\s*\([^)]*\)\s*{/gm) || []).length;
      const propertyCount = (content.match(/this\.\w+|self\.\w+|@\w+/gm) || []).length;
      
      if (methodCount > 15 || propertyCount > 20) {
        largeClasses.push(path.relative(repoPath, filePath));
      }
    } catch (error) {
      // Handle file read errors
    }
  }
  
  return [...new Set(largeClasses)];
};

// API Routes

// Analyze repository architecture
router.post('/:repoId/analyze', authenticateToken, async (req, res) => {
  try {
    const { repoId } = req.params;
    const { repoPath } = req.body;
    
    if (!repoPath) {
      return res.status(400).json({ error: 'Repository path is required' });
    }
    
    const analysis = await analyzeArchitecture(repoId, repoPath);
    
    res.json({
      message: 'Architecture analysis completed',
      analysis
    });
  } catch (error) {
    console.error('Architecture analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get architecture patterns for repository
router.get('/:repoId/patterns', authenticateToken, async (req, res) => {
  try {
    const { repoId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM architecture_patterns WHERE repo_id = $1 ORDER BY confidence_score DESC',
      [repoId]
    );
    
    res.json({ patterns: result.rows });
  } catch (error) {
    console.error('Get patterns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get UML diagram data
router.get('/:repoId/uml', authenticateToken, async (req, res) => {
  try {
    const { repoId } = req.params;
    
    // This would typically retrieve stored UML data
    // For now, generate a basic response
    res.json({
      umlData: {
        classes: [],
        relationships: [],
        mermaidUML: 'classDiagram\n  class Example {\n    +method()\n  }\n'
      }
    });
  } catch (error) {
    console.error('Get UML error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;