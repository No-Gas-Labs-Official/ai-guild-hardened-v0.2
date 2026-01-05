const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('./auth');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Generate prototype from description
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { description, project_type, tech_stack, features } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'Project description is required' });
    }
    
    // Parse project requirements
    const requirements = parseProjectRequirements(description, project_type, features);
    
    // Generate project structure
    const projectStructure = generateProjectStructure(requirements);
    
    // Generate code files
    const generatedCode = await generateCodeFiles(requirements, projectStructure);
    
    // Generate unit tests
    const testFiles = await generateTests(requirements, projectStructure);
    
    // Generate documentation
    const documentation = await generateDocumentation(requirements, projectStructure);
    
    // Create prototype record
    const prototypeResult = await pool.query(
      `INSERT INTO prototypes (name, description, project_type, generated_code, dependencies, test_results, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        requirements.projectName,
        description,
        requirements.projectType,
        JSON.stringify(generatedCode),
        JSON.stringify(requirements.dependencies),
        JSON.stringify({ testFiles: Object.keys(testFiles).length }),
        'draft',
        req.user.userId
      ]
    );
    
    const prototype = prototypeResult.rows[0];
    
    res.status(201).json({
      message: 'Prototype generated successfully',
      prototype: {
        id: prototype.id,
        name: prototype.name,
        description: prototype.description,
        project_type: prototype.project_type,
        status: prototype.status,
        created_at: prototype.created_at
      },
      generated_code: generatedCode,
      test_files: testFiles,
      documentation
    });
  } catch (error) {
    console.error('Generate prototype error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Parse project requirements from description
const parseProjectRequirements = (description, projectType, features) => {
  // Extract project name
  const projectName = extractProjectName(description) || 'Generated Project';
  
  // Determine project type
  const detectedType = projectType || detectProjectType(description);
  
  // Extract features
  const extractedFeatures = features || extractFeatures(description);
  
  // Determine tech stack
  const techStack = determineTechStack(detectedType, description);
  
  // Generate dependencies
  const dependencies = generateDependencies(detectedType, techStack, extractedFeatures);
  
  return {
    projectName,
    projectType: detectedType,
    description,
    features: extractedFeatures,
    techStack,
    dependencies
  };
};

// Extract project name from description
const extractProjectName = (description) => {
  const patterns = [
    /(?:build|create|develop|make)\s+(?:a\s+)?([a-zA-Z0-9\s]+?)(?:\s+(?:app|application|website|system|platform))/i,
    /(?:called|named)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:that|which|with))/i,
    /^([a-zA-Z0-9\s]+?)(?:\s+(?:is|should|will|needs))/i
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      return match[1].trim().replace(/\s+/g, '-');
    }
  }
  
  return null;
};

// Detect project type from description
const detectProjectType = (description) => {
  const keywords = {
    'web-app': ['website', 'web app', 'web application', 'online', 'browser', 'frontend', 'backend'],
    'mobile-app': ['mobile app', 'ios', 'android', 'phone', 'tablet', 'mobile'],
    'api': ['api', 'rest', 'graphql', 'endpoint', 'service', 'backend'],
    'cli': ['command line', 'cli', 'terminal', 'console', 'script'],
    'desktop': ['desktop app', 'desktop application', 'windows', 'macos', 'linux app'],
    'microservice': ['microservice', 'service', 'distributed', 'scalable'],
    'data-processing': ['data', 'analytics', 'processing', 'pipeline', 'etl']
  };
  
  const lowerDesc = description.toLowerCase();
  
  for (const [type, typeKeywords] of Object.entries(keywords)) {
    if (typeKeywords.some(keyword => lowerDesc.includes(keyword))) {
      return type;
    }
  }
  
  return 'web-app'; // Default
};

// Extract features from description
const extractFeatures = (description) => {
  const features = [];
  
  // Common features to look for
  const featurePatterns = {
    'authentication': ['login', 'signup', 'auth', 'authentication', 'user login', 'register'],
    'database': ['database', 'data storage', 'save data', 'store', 'persist'],
    'api': ['api', 'rest api', 'endpoints', 'backend service'],
    'ui': ['user interface', 'ui', 'frontend', 'design', 'layout'],
    'forms': ['form', 'input', 'submit', 'user input'],
    'dashboard': ['dashboard', 'admin panel', 'analytics', 'reports'],
    'search': ['search', 'filter', 'find'],
    'upload': ['upload', 'file', 'image', 'document'],
    'notifications': ['notification', 'alert', 'email', 'sms'],
    'payment': ['payment', 'checkout', 'billing', 'stripe', 'paypal'],
    'social': ['social', 'share', 'like', 'comment', 'follow'],
    'real-time': ['real-time', 'live', 'websocket', 'socket'],
    'maps': ['map', 'location', 'gps', 'geolocation'],
    'charts': ['chart', 'graph', 'visualization', 'analytics']
  };
  
  const lowerDesc = description.toLowerCase();
  
  for (const [feature, keywords] of Object.entries(featurePatterns)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      features.push(feature);
    }
  }
  
  return features;
};

// Determine tech stack
const determineTechStack = (projectType, description) => {
  const stacks = {
    'web-app': {
      frontend: ['React', 'TypeScript', 'Tailwind CSS'],
      backend: ['Node.js', 'Express', 'TypeScript'],
      database: ['PostgreSQL', 'Prisma ORM']
    },
    'mobile-app': {
      framework: ['React Native', 'TypeScript'],
      backend: ['Node.js', 'Express'],
      database: ['PostgreSQL']
    },
    'api': {
      framework: ['Node.js', 'Express', 'TypeScript'],
      database: ['PostgreSQL', 'MongoDB'],
      documentation: ['Swagger/OpenAPI']
    },
    'cli': {
      language: ['TypeScript', 'Node.js'],
      libraries: ['Commander.js', 'Inquirer', 'Chalk']
    },
    'desktop': {
      framework: ['Electron', 'React', 'TypeScript'],
      backend: ['Node.js']
    },
    'microservice': {
      framework: ['Node.js', 'Express', 'TypeScript'],
      database: ['PostgreSQL'],
      messaging: ['Redis', 'RabbitMQ'],
      containerization: ['Docker']
    },
    'data-processing': {
      language: ['Python', 'Node.js'],
      libraries: ['Pandas', 'NumPy', 'D3.js'],
      database: ['PostgreSQL', 'Redis']
    }
  };
  
  return stacks[projectType] || stacks['web-app'];
};

// Generate dependencies
const generateDependencies = (projectType, techStack, features) => {
  const baseDependencies = {
    'web-app': {
      'package.json': {
        dependencies: {
          'express': '^4.18.2',
          'cors': '^2.8.5',
          'helmet': '^7.1.0',
          'morgan': '^1.10.0',
          'dotenv': '^16.3.1',
          'bcryptjs': '^2.4.3',
          'jsonwebtoken': '^9.0.2',
          'pg': '^8.11.3'
        },
        devDependencies: {
          'typescript': '^5.2.2',
          '@types/node': '^20.8.7',
          '@types/express': '^4.17.20',
          'ts-node': '^10.9.1',
          'nodemon': '^3.0.1',
          'jest': '^29.7.0',
          '@types/jest': '^29.5.6'
        }
      }
    }
  };
  
  const deps = baseDependencies[projectType] || baseDependencies['web-app'];
  
  // Add feature-specific dependencies
  if (features.includes('authentication')) {
    deps['package.json'].dependencies['passport'] = '^0.6.0';
    deps['package.json'].dependencies['passport-local'] = '^1.0.0';
  }
  
  if (features.includes('upload')) {
    deps['package.json'].dependencies['multer'] = '^1.4.5-lts.1';
    deps['package.json'].dependencies['sharp'] = '^0.32.6';
  }
  
  if (features.includes('real-time')) {
    deps['package.json'].dependencies['socket.io'] = '^4.7.4';
  }
  
  return deps;
};

// Generate project structure
const generateProjectStructure = (requirements) => {
  const baseStructure = {
    'src': {
      'controllers': {},
      'models': {},
      'routes': {},
      'middleware': {},
      'utils': {},
      'config': {},
      'tests': {}
    },
    'public': {},
    'docs': {}
  };
  
  // Add feature-specific directories
  if (requirements.features.includes('upload')) {
    baseStructure['uploads'] = {};
  }
  
  if (requirements.features.includes('database')) {
    baseStructure['migrations'] = {};
    baseStructure['seeds'] = {};
  }
  
  return baseStructure;
};

// Generate code files
const generateCodeFiles = async (requirements, structure) => {
  const files = {};
  
  // Generate package.json
  files['package.json'] = generatePackageJson(requirements);
  
  // Generate main server file
  files['src/server.ts'] = generateServerFile(requirements);
  
  // Generate configuration files
  files['src/config/database.ts'] = generateDatabaseConfig(requirements);
  
  // Generate routes
  files['src/routes/index.ts'] = generateRoutes(requirements);
  
  // Generate controllers based on features
  if (requirements.features.includes('authentication')) {
    files['src/controllers/authController.ts'] = generateAuthController();
    files['src/models/User.ts'] = generateUserModel();
  }
  
  // Generate API documentation
  files['docs/api.md'] = generateApiDocs(requirements);
  
  // Generate README
  files['README.md'] = generateReadmeFile(requirements);
  
  // Generate TypeScript configuration
  files['tsconfig.json'] = generateTsConfig();
  
  // Generate environment template
  files['.env.example'] = generateEnvExample();
  
  // Generate Docker configuration if microservice
  if (requirements.projectType === 'microservice') {
    files['Dockerfile'] = generateDockerfile();
    files['docker-compose.yml'] = generateDockerCompose();
  }
  
  return files;
};

// Generate package.json
const generatePackageJson = (requirements) => {
  const dependencies = generateDependencies(requirements.projectType, requirements.techStack, requirements.features);
  
  return JSON.stringify({
    name: requirements.projectName.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    description: requirements.description,
    main: 'dist/server.js',
    scripts: {
      start: 'node dist/server.js',
      dev: 'nodemon src/server.ts',
      build: 'tsc',
      test: 'jest',
      'test:watch': 'jest --watch'
    },
    keywords: requirements.features,
    author: 'No-Gas-Labs™',
    license: 'MIT',
    ...dependencies['package.json']
  }, null, 2);
};

// Generate server file
const generateServerFile = (requirements) => {
  return `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: '${requirements.projectName}'
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(\`🚀 \${process.env.SERVICE_NAME || '${requirements.projectName}'} server running on port \${PORT}\`);
});

export default app;
`;
};

// Generate database configuration
const generateDatabaseConfig = (requirements) => {
  return `import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || '${requirements.projectName.toLowerCase().replace(/\\s+/g, '_')}',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

export default pool;
`;
};

// Generate routes
const generateRoutes = (requirements) => {
  let routes = `import express from 'express';
${requirements.features.includes('authentication') ? "import authRoutes from './authController';" : ''}

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

${requirements.features.includes('authentication') ? "// Authentication routes\nrouter.use('/auth', authRoutes);" : ''}

// API routes will be added here based on your requirements

export default router;
`;
  return routes;
};

// Generate authentication controller
const generateAuthController = () => {
  return `import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Save user
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, passwordHash]
    );
    
    const user = result.rows[0];
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, username: user.username, email: user.email },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      user: { id: user.id, username: user.username, email: user.email },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
`;
};

// Generate user model
const generateUserModel = () => {
  return `export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
}
`;
};

// Generate API documentation
const generateApiDocs = (requirements) => {
  return `# API Documentation for ${requirements.projectName}

## Overview

This document describes the REST API endpoints for the ${requirements.projectName} application.

## Base URL

\`\`\`
https://api.example.com/api
\`\`\`

## Authentication

Include your JWT token in the Authorization header:

\`\`\`
Authorization: Bearer YOUR_JWT_TOKEN
\`\`\`

## Endpoints

### Health Check

\`\`\`
GET /health
\`\`\`

Returns the health status of the API.

**Response:**
\`\`\`json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

${requirements.features.includes('authentication') ? `
### Authentication

#### Register

\`\`\`
POST /auth/register
\`\`\`

Register a new user account.

**Request Body:**
\`\`\`json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
\`\`\`

**Response:**
\`\`\`json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  },
  "token": "jwt_token_here"
}
\`\`\`

#### Login

\`\`\`
POST /auth/login
\`\`\`

Authenticate a user and receive a JWT token.

**Request Body:**
\`\`\`json
{
  "username": "string",
  "password": "string"
}
\`\`\`

**Response:**
\`\`\`json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  },
  "token": "jwt_token_here"
}
\`\`\`
` : ''}

## Error Responses

All endpoints may return the following error responses:

- \`400 Bad Request\` - Invalid request parameters
- \`401 Unauthorized\` - Authentication required
- \`404 Not Found\` - Resource not found
- \`500 Internal Server Error\` - Server error

## Data Models

${requirements.features.includes('authentication') ? `
### User

\`\`\`json
{
  "id": "integer",
  "username": "string",
  "email": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
\`\`\`
` : ''}

---
*Generated by No-Gas-Labs™ Prototype Generator*
`;
};

// Generate README file
const generateReadmeFile = (requirements) => {
  return `# ${requirements.projectName}

${requirements.description}

## 🚀 Features

${requirements.features.map(feature => `- ${feature}`).join('\n')}

## 🛠️ Tech Stack

${Object.entries(requirements.techStack).map(([category, items]) => 
  `- **${category}**: ${Array.isArray(items) ? items.join(', ') : items}`
).join('\n')}

## 📦 Installation

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd ${requirements.projectName.toLowerCase().replace(/\s+/g, '-')}

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
\`\`\`

## 🏃‍♂️ Getting Started

\`\`\`bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
\`\`\`

## 🧪 Testing

\`\`\`bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
\`\`\`

## 📝 API Documentation

See [docs/api.md](docs/api.md) for detailed API documentation.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🤖 Generated by No-Gas-Labs™

This project was automatically generated by the No-Gas-Labs™ Prototype Generator.

---
*Generated on ${new Date().toISOString().split('T')[0]}*
`;
};

// Generate TypeScript configuration
const generateTsConfig = () => {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      module: 'commonjs',
      lib: ['ES2020'],
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist', '**/*.test.ts']
  }, null, 2);
};

// Generate environment example
const generateEnvExample = () => {
  return `# Server Configuration
PORT=3000
NODE_ENV=development
SERVICE_NAME=Generated Service

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key

# Other Configuration
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
`;
};

// Generate Dockerfile
const generateDockerfile = () => {
  return `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
`;
};

// Generate Docker Compose
const generateDockerCompose = () => {
  return `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
    depends_on:
      - postgres
    networks:
      - app-network

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: app_database
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network

volumes:
  postgres_data:

networks:
  app-network:
    driver: bridge
`;
};

// Generate unit tests
const generateTests = async (requirements, structure) => {
  const tests = {};
  
  // Generate basic server test
  tests['src/tests/server.test.ts'] = generateServerTest();
  
  if (requirements.features.includes('authentication')) {
    tests['src/tests/auth.test.ts'] = generateAuthTest();
  }
  
  return tests;
};

// Generate server test
const generateServerTest = () => {
  return `import request from 'supertest';
import app from '../server';

describe('Server', () => {
  it('should respond with health check', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.status).toBe('OK');
    expect(response.body).toHaveProperty('timestamp');
  });
});
`;
};

// Generate authentication test
const generateAuthTest = () => {
  return `import request from 'supertest';
import app from '../server';

describe('Authentication', () => {
  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
      
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body).toHaveProperty('token');
    });
  });
  
  describe('POST /auth/login', () => {
    it('should login a user', async () => {
      const loginData = {
        username: 'testuser',
        password: 'password123'
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);
      
      expect(response.body.message).toBe('Login successful');
      expect(response.body).toHaveProperty('token');
    });
  });
});
`;
};

// Generate documentation
const generateDocumentation = async (requirements, structure) => {
  return {
    projectOverview: generateProjectOverview(requirements),
    setupGuide: generateSetupGuide(requirements),
    apiReference: generateApiDocs(requirements),
    architecture: generateArchitectureDocs(requirements),
    deployment: generateDeploymentDocs(requirements)
  };
};

// Generate project overview
const generateProjectOverview = (requirements) => {
  return `# Project Overview

## ${requirements.projectName}

${requirements.description}

## Purpose

This application was automatically generated based on your requirements to provide a solid foundation for development.

## Key Features

${requirements.features.map(feature => `- **${feature}**: Implemented with best practices`).join('\n')}

## Architecture

The application follows a clean architecture pattern with separation of concerns:

- **Controllers**: Handle HTTP requests and responses
- **Models**: Define data structures and business logic
- **Routes**: Define API endpoints
- **Middleware**: Handle cross-cutting concerns
- **Config**: Configuration management

## Technology Choices

${Object.entries(requirements.techStack).map(([category, items]) => 
  `### ${category}\n${Array.isArray(items) ? items.map(item => `- ${item}`).join('\n') : `- ${items}`}`
).join('\n\n')}

## Next Steps

1. Review the generated code
2. Customize the implementation to your specific needs
3. Add additional features and business logic
4. Write comprehensive tests
5. Set up CI/CD pipeline
6. Deploy to production

---
*Generated by No-Gas-Labs™ Prototype Generator*
`;
};

// Generate setup guide
const generateSetupGuide = (requirements) => {
  return `# Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL (if using database features)
- Git

## Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <your-repository-url>
   cd ${requirements.projectName.toLowerCase().replace(/\\s+/g, '-')}
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up environment variables**
   \`\`\`bash
   cp .env.example .env
   \`\`\`
   
   Edit \`.env\` file with your configuration:
   \`\`\`
   PORT=3000
   DB_HOST=localhost
   DB_NAME=${requirements.projectName.toLowerCase().replace(/\\s+/g, '_')}
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your-super-secret-key
   \`\`\`

4. **Set up database** (if applicable)
   \`\`\`bash
   # Create database
   createdb ${requirements.projectName.toLowerCase().replace(/\\s+/g, '_')}
   
   # Run migrations (if available)
   npm run migrate
   \`\`\`

5. **Build the project**
   \`\`\`bash
   npm run build
   \`\`\`

## Running the Application

### Development Mode

\`\`\`bash
npm run dev
\`\`\`

The server will start at \`http://localhost:3000\`

### Production Mode

\`\`\`bash
npm start
\`\`\`

## Testing

\`\`\`bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
\`\`\`

## Project Structure

\`\`\`
${requirements.projectName.toLowerCase().replace(/\\s+/g, '-')}/
├── src/
│   ├── controllers/     # Request handlers
│   ├── models/         # Data models
│   ├── routes/         # API routes
│   ├── middleware/     # Custom middleware
│   ├── utils/          # Utility functions
│   ├── config/         # Configuration files
│   └── tests/          # Test files
├── public/             # Static assets
├── docs/               # Documentation
├── uploads/            # File uploads (if applicable)
└── migrations/         # Database migrations
\`\`\`

## Development Workflow

1. Make changes to your code
2. Write tests for new functionality
3. Run tests to ensure everything works
4. Commit your changes
5. Push to your repository

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check that PostgreSQL is running
   - Verify database credentials in .env
   - Ensure database exists

2. **Port already in use**
   - Change PORT in .env file
   - Or kill the process using the port

3. **TypeScript compilation errors**
   - Check tsconfig.json configuration
   - Ensure all dependencies are installed

### Getting Help

- Check the logs in the console
- Review the error messages
- Consult the documentation in the docs/ folder

---
*Generated by No-Gas-Labs™ Prototype Generator*
`;
};

// Generate architecture documentation
const generateArchitectureDocs = (requirements) => {
  return `# Architecture Documentation

## System Architecture

### Overview

The ${requirements.projectName} follows a layered architecture pattern to ensure maintainability, scalability, and testability.

### Architecture Layers

#### 1. Presentation Layer (API)
- Handles HTTP requests and responses
- Input validation and sanitization
- Authentication and authorization
- Error handling and response formatting

#### 2. Business Logic Layer
- Controllers handle business rules
- Service classes implement core functionality
- Data validation and transformation
- Integration with external services

#### 3. Data Access Layer
- Database operations and queries
- Data models and schemas
- Connection management
- Transaction handling

#### 4. Infrastructure Layer
- Configuration management
- Logging and monitoring
- Caching
- File storage

### Component Diagram

\`\`\`mermaid
graph TB
    A[Client] --> B[API Routes]
    B --> C[Controllers]
    C --> D[Services]
    D --> E[Models]
    E --> F[Database]
    
    G[Middleware] --> B
    H[Utils] --> D
    I[Config] --> C
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#e8f5e8
    style D fill:#fff3e0
    style E fill:#fce4ec
    style F fill:#f1f8e9
\`\`\`

## Design Patterns

### 1. Repository Pattern
Data access is abstracted through repository interfaces, making it easier to switch between different data sources.

### 2. Controller Pattern
Controllers handle HTTP requests and coordinate between different layers of the application.

### 3. Middleware Pattern
Cross-cutting concerns like authentication, logging, and error handling are implemented as middleware.

### 4. Dependency Injection
Dependencies are injected rather than hard-coded, improving testability and flexibility.

## Security Architecture

### Authentication
- JWT-based authentication
- Password hashing with bcrypt
- Token expiration and refresh

### Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- API rate limiting

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection headers
- CORS configuration

## Performance Considerations

### Caching Strategy
- In-memory caching for frequently accessed data
- Database query optimization
- Response compression

### Scalability
- Stateless API design
- Horizontal scaling support
- Load balancing ready
- Microservice-friendly structure

## Monitoring and Logging

### Logging Strategy
- Structured logging with Winston
- Different log levels for different environments
- Request/response logging
- Error tracking and alerting

### Health Monitoring
- Health check endpoints
- Performance metrics
- Database connection monitoring
- Memory and CPU usage tracking

## Deployment Architecture

### Development Environment
- Local development setup
- Hot reloading with nodemon
- Development database
- Debug configuration

### Production Environment
- Containerized deployment with Docker
- Load balancing
- Database replication
- Backup and recovery procedures

---
*Generated by No-Gas-Labs™ Prototype Generator*
`;
};

// Generate deployment documentation
const generateDeploymentDocs = (requirements) => {
  return `# Deployment Guide

## Deployment Options

### 1. Traditional Server Deployment

#### Prerequisites
- Linux server (Ubuntu 20.04+ recommended)
- Node.js v18+
- PostgreSQL 15+
- Nginx (for reverse proxy)
- SSL certificate

#### Deployment Steps

1. **Server Setup**
   \`\`\`bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PostgreSQL
   sudo apt install postgresql postgresql-contrib
   
   # Install Nginx
   sudo apt install nginx
   \`\`\`

2. **Application Deployment**
   \`\`\`bash
   # Clone repository
   git clone <your-repo-url>
   cd ${requirements.projectName.toLowerCase().replace(/\\s+/g, '-')}
   
   # Install dependencies
   npm ci --only=production
   
   # Build application
   npm run build
   
   # Set up environment
   sudo nano .env
   \`\`\`

3. **Database Setup**
   \`\`\`bash
   # Create database user
   sudo -u postgres createuser --interactive
   
   # Create database
   sudo -u postgres createdb ${requirements.projectName.toLowerCase().replace(/\\s+/g, '_')}
   
   # Run migrations
   npm run migrate
   \`\`\`

4. **Process Management**
   \`\`\`bash
   # Install PM2
   sudo npm install -g pm2
   
   # Start application
   pm2 start ecosystem.config.js
   
   # Enable startup
   pm2 startup
   pm2 save
   \`\`\`

5. **Nginx Configuration**
   \`\`\`nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   \`\`\`

### 2. Docker Deployment

#### Build Docker Image
\`\`\`bash
# Build image
docker build -t ${requirements.projectName.toLowerCase().replace(/\\s+/g, '-')} .

# Run container
docker run -d \\
  --name ${requirements.projectName.toLowerCase().replace(/\\s+/g, '-')} \\
  -p 3000:3000 \\
  -e NODE_ENV=production \\
  ${requirements.projectName.toLowerCase().replace(/\\s+/g, '-')}
\`\`\`

#### Docker Compose
\`\`\`bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
\`\`\`

### 3. Cloud Platform Deployment

#### Heroku
\`\`\`bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set DB_URL=your-database-url

# Deploy
git push heroku main
\`\`\`

#### AWS (Elastic Beanstalk)
\`\`\`bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init

# Create environment
eb create production

# Deploy
eb deploy
\`\`\`

#### Google Cloud Platform
\`\`\`bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash

# Deploy to App Engine
gcloud app deploy
\`\`\`

## Environment Configuration

### Production Environment Variables
\`\`\`
NODE_ENV=production
PORT=3000
DB_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-production-secret
CORS_ORIGIN=https://your-domain.com
LOG_LEVEL=error
\`\`\`

### Security Configuration
1. **HTTPS Setup**
   - Obtain SSL certificate (Let's Encrypt recommended)
   - Configure Nginx for HTTPS
   - Set up automatic certificate renewal

2. **Firewall Configuration**
   \`\`\`bash
   # Allow necessary ports
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   \`\`\`

3. **Database Security**
   - Change default PostgreSQL passwords
   - Restrict database access to application server only
   - Enable SSL for database connections

## Monitoring and Maintenance

### Application Monitoring
1. **Set up monitoring tools**
   - Application performance monitoring (APM)
   - Error tracking (Sentry, etc.)
   - Uptime monitoring

2. **Log Management**
   \`\`\`bash
   # Rotate logs
   sudo nano /etc/logrotate.d/${requirements.projectName.toLowerCase().replace(/\\s+/g, '-')}
   \`\`\`

### Backup Strategy
1. **Database Backups**
   \`\`\`bash
   # Automated backup script
   #!/bin/bash
   pg_dump ${requirements.projectName.toLowerCase().replace(/\\s+/g, '_')} > backup_\$(date +%Y%m%d_%H%M%S).sql
   \`\`\`

2. **File Backups**
   - Regular application file backups
   - Configuration backups
   - Store backups in secure location

### Updates and Maintenance
1. **Application Updates**
   - Zero-downtime deployment strategy
   - Blue-green deployment
   - Rollback procedures

2. **System Updates**
   - Regular security patches
   - Dependency updates
   - Performance optimizations

## Scaling Considerations

### Horizontal Scaling
- Load balancer configuration
- Multiple application instances
- Session management (Redis)
- Database read replicas

### Performance Optimization
- Caching strategies
- Database indexing
- CDN setup for static assets
- Image optimization

---
*Generated by No-Gas-Labs™ Prototype Generator*
`;
};

// Get all prototypes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, limit = 20 } = req.query;
    
    let query = 'SELECT * FROM prototypes WHERE created_by = $1';
    const params = [req.user.userId];
    
    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    
    const result = await pool.query(query, params);
    res.json({ prototypes: result.rows });
  } catch (error) {
    console.error('Get prototypes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get prototype by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM prototypes WHERE id = $1 AND created_by = $2',
      [id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prototype not found' });
    }
    
    res.json({ prototype: result.rows[0] });
  } catch (error) {
    console.error('Get prototype error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Deploy prototype
router.post('/:id/deploy', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { deployment_config } = req.body;
    
    // Get prototype
    const prototypeResult = await pool.query(
      'SELECT * FROM prototypes WHERE id = $1 AND created_by = $2',
      [id, req.user.userId]
    );
    
    if (prototypeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prototype not found' });
    }
    
    const prototype = prototypeResult.rows[0];
    
    // In production, this would deploy the prototype to a cloud platform
    // For now, simulate deployment
    const deploymentUrl = `https://${prototype.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.example.com`;
    
    // Update prototype with deployment info
    await pool.query(
      'UPDATE prototypes SET deployment_url = $1, status = $2 WHERE id = $3',
      [deploymentUrl, 'deployed', id]
    );
    
    res.json({
      message: 'Prototype deployed successfully',
      deployment_url: deploymentUrl,
      status: 'deployed'
    });
  } catch (error) {
    console.error('Deploy prototype error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete prototype
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM prototypes WHERE id = $1 AND created_by = $1 RETURNING *',
      [id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prototype not found' });
    }
    
    res.json({ message: 'Prototype deleted successfully' });
  } catch (error) {
    console.error('Delete prototype error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;