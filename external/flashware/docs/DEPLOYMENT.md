# Flashware v1.0 - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying Flashware v1.0 to various environments. Flashware can be deployed locally for development or to production environments using the provided deployment scripts.

## Prerequisites

### System Requirements

- **Node.js** 18.x or higher
- **PostgreSQL** 12.x or higher
- **Sui CLI** Latest version
- **Docker** (for Move compilation)
- **Git** for version control
- **tmux** (for background services)

### Wallet Requirements

- **Sui Wallet** with testnet SUI tokens
- **Suiet Extension** installed in browser
- **GitHub Personal Access Token** (for deployment automation)

### Network Requirements

- **Internet Connection** for blockchain and package installations
- **Sui Testnet** access
- **GitHub API** access (if using automated deployment)

## Quick Start Deployment

### Automated Deployment (Recommended)

The fastest way to deploy Flashware is using the automated deployment script:

```bash
# Clone or navigate to the flashware-monorepo directory
cd flashware-monorepo

# Make scripts executable
chmod +x scripts/*.sh

# Run environment setup
./scripts/setup-env.sh

# Run full deployment
./scripts/deploy-all.sh
```

This script will:
1. Set up the repository and dependencies
2. Deploy Move contracts to Sui testnet
3. Set up PostgreSQL database
4. Start frontend and backend services
5. Launch monitoring daemon
6. Generate user handoff with all necessary links

### Manual Deployment

If you prefer to deploy components manually, follow the steps below.

## Environment Setup

### 1. Install System Dependencies

#### On Ubuntu/Debian

```bash
# Update package manager
sudo apt update

# Install required packages
sudo apt install -y nodejs npm postgresql postgresql-contrib curl git tmux

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

#### On macOS

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required packages
brew install node postgresql tmux docker git

# Start PostgreSQL
brew services start postgresql
```

### 2. Install Sui CLI

```bash
# Install Sui CLI
curl --proto '=https' --tlsv1.2 -sSf https://install.sui.app | sh -s -- -y

# Add to PATH (if not already added)
echo 'export PATH=$PATH:$HOME/.cargo/bin' >> ~/.bashrc
source ~/.bashrc

# Verify installation
sui --version
```

### 3. Setup Sui Testnet Wallet

```bash
# Initialize Sui client for testnet
sui client new-address --ed25519
sui client switch --network testnet

# Request testnet SUI tokens (visit the faucet)
echo "Get testnet SUI from: https://faucet.testnet.sui.io/"
```

### 4. Setup Database

```bash
# Start PostgreSQL service
sudo systemctl start postgresql  # Linux
# or
brew services start postgresql  # macOS

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE flashware;
CREATE USER flashware WITH PASSWORD 'flashware_password';
GRANT ALL PRIVILEGES ON DATABASE flashware TO flashware;
\q
EOF
```

## Application Deployment

### 1. Clone and Setup Repository

```bash
# Clone the repository
git clone https://github.com/NinjaTech-AI/flashware-monorepo.git
cd flashware-monorepo

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Configure Environment Variables

#### Backend Environment (.env.local)

```bash
# Create backend environment file
cat > backend/.env.local << EOF
# Database
DATABASE_URL=postgresql://flashware:flashware_password@localhost:5432/flashware

# Sui Configuration
SUI_RPC_URL=https://fullnode.testnet.sui.io
SUI_NETWORK=testnet

# Security
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Flashware Contract (will be set after deployment)
FLASHWARE_PACKAGE_ID=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
```

#### Frontend Environment (.env.local)

```bash
# Create frontend environment file
cat > frontend/.env.local << EOF
# Sui Configuration
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.testnet.sui.io

# Flashware Contract (will be set after deployment)
NEXT_PUBLIC_FLASHWARE_PACKAGE_ID=

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# Wallet Configuration
NEXT_PUBLIC_WALLET_NETWORK=testnet
EOF
```

### 3. Setup Database

```bash
# Navigate to backend directory
cd backend

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# (Optional) Seed database with initial data
npx prisma db seed

cd ..
```

## Smart Contract Deployment

### 1. Prepare Move Contracts

```bash
# Navigate to contracts directory
cd move_contracts

# Verify contract structure
ls sources/
# Should show: flash_loan.move, pool.move, receipt.move

# Compile contracts
sui move build

# If compilation succeeds, you're ready to deploy
```

### 2. Deploy to Sui Testnet

```bash
# Deploy contracts to testnet
deploy_output=$(sui client publish --gas-budget 100000000)

# Extract package ID from deployment output
package_id=$(echo "$deploy_output" | grep -o '"packageId":"[^"]*"' | cut -d'"' -f4)

echo "Deployed package ID: $package_id"

# Update environment files with package ID
cd ../backend
echo "FLASHWARE_PACKAGE_ID=$package_id" >> .env.local

cd ../frontend
echo "NEXT_PUBLIC_FLASHWARE_PACKAGE_ID=$package_id" >> .env.local

cd ..
```

### 3. Verify Deployment

```bash
# Verify package is deployed
sui client object $package_id

# Check contract modules
sui client object $package_id --json | jq '.data.contents[] | select(.type | contains("MoveModule"))'
```

## Service Deployment

### 1. Start Services Locally

#### Using tmux (Recommended)

```bash
# Create a tmux session for background services
tmux new-session -d -s flashware "npm run dev:all"

# Attach to see service logs
tmux attach-session -t flashware

# Detach from tmux session (Ctrl+B, then D)
```

#### Running in Separate Terminals

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### 2. Verify Services

```bash
# Check backend health
curl http://localhost:3001/health

# Check frontend
curl http://localhost:3000

# Expected backend response:
# {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z","version":"1.0.0"}
```

## Production Deployment

### 1. Frontend Deployment (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy frontend
cd frontend
vercel --prod

# Set environment variables in Vercel dashboard
# NEXT_PUBLIC_FLASHWARE_PACKAGE_ID
# NEXT_PUBLIC_SUI_NETWORK=testnet
# NEXT_PUBLIC_API_URL=<backend-url>
```

### 2. Backend Deployment (Railway)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize Railway project
cd backend
railway init

# Set environment variables
railway variables set DATABASE_URL=postgresql://...
railway variables set FLASHWARE_PACKAGE_ID=...
railway variables set NODE_ENV=production

# Deploy
railway up

# Get deployment URL
railway domain
```

### 3. Database Deployment (Railway/Heroku)

#### Using Railway

```bash
# Add PostgreSQL database to Railway project
railway add postgresql

# Get database connection string
railway variables get DATABASE_URL
```

#### Using External Provider

```bash
# Example with Supabase
# Create project at https://supabase.com
# Get connection string
# Set DATABASE_URL in backend environment
```

### 4. Smart Contract Deployment

```bash
# Deploy to mainnet (when ready)
sui client switch --network mainnet
sui client publish --gas-budget 1000000000

# Update environment variables with mainnet package ID
```

## Monitoring and Maintenance

### 1. Service Monitoring

```bash
# Check service status
curl https://your-backend-url.com/health

# Monitor logs
tail -f backend/logs/app.log
tail -f frontend/logs/next.log

# Monitor database connections
psql -d $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"
```

### 2. Blockchain Monitoring

```bash
# Start monitoring daemon
./scripts/monitor-user.sh $PACKAGE_ID $SESSION_ID

# Check monitoring logs
tail -f monitoring.log
```

### 3. Backup Strategy

#### Database Backups

```bash
# Create database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/flashware"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump $DATABASE_URL > $BACKUP_DIR/backup_$DATE.sql
# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
EOF

chmod +x backup.sh
```

#### Smart Contract Backups

```bash
# Backup contract source code
tar -czf contracts_backup_$(date +%Y%m%d).tar.gz move_contracts/

# Store package deployment info
echo "$PACKAGE_ID deployed on $(date)" >> deployment_history.txt
```

## Troubleshooting

### Common Issues

#### 1. Move Compilation Fails

```bash
# Check Move version
sui move --version

# Clean build artifacts
cd move_contracts
sui move clean

# Rebuild
sui move build

# Check for syntax errors
sui move verify
```

#### 2. Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -d $DATABASE_URL -c "SELECT 1;"

# Check user permissions
sudo -u postgres psql -c "\du"
```

#### 3. Service Startup Issues

```bash
# Check port availability
netstat -tlnp | grep :3000
netstat -tlnp | grep :3001

# Check Node.js processes
ps aux | grep node

# Kill processes on ports
sudo fuser -k 3000/tcp
sudo fuser -k 3001/tcp
```

#### 4. Wallet Connection Issues

```bash
# Check Sui client configuration
sui client active-address
sui client active-env

# Reset Sui client
sui client envs
sui client switch --network testnet
```

### Debug Mode

#### Enable Debug Logging

```bash
# Backend debug mode
cd backend
DEBUG=flashware:* npm run dev

# Frontend debug mode
cd frontend
DEBUG=* npm run dev
```

#### Database Debug

```bash
# Enable query logging
cd backend
echo "DATABASE_URL=$DATABASE_URL&statement_cache_size=0" >> .env.local

# Monitor queries
npx prisma studio
```

## Performance Optimization

### Frontend Optimization

```bash
# Build for production
cd frontend
npm run build

# Analyze bundle size
npx @next/bundle-analyzer

# Enable compression
# Configure nginx/CDN for gzip compression
```

### Backend Optimization

```bash
# Enable connection pooling
# Configure DATABASE_URL with pool parameters

# Enable caching
npm install redis
# Configure Redis client in backend
```

### Database Optimization

```sql
-- Create indexes for performance
CREATE INDEX idx_deployments_wallet_address ON deployments(wallet_address);
CREATE INDEX idx_executions_deployment_id ON executions(deployment_id);
CREATE INDEX idx_executions_status ON executions(status);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM deployments WHERE wallet_address = '0x...';
```

## Security Considerations

### Environment Security

```bash
# Secure environment files
chmod 600 .env.local
chmod 600 backend/.env.local
chmod 600 frontend/.env.local

# Use secrets management service
# AWS Secrets Manager, HashiCorp Vault, etc.
```

### Network Security

```bash
# Configure firewall
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# Use HTTPS in production
# Configure SSL certificates (Let's Encrypt)
```

### Smart Contract Security

```bash
# Verify contract on testnet
sui client verify $PACKAGE_ID

# Run formal verification (if available)
sui move prove
```

## Scaling Considerations

### Horizontal Scaling

```bash
# Load balancer configuration (nginx)
# Multiple backend instances
# Database read replicas
```

### Rate Limiting

```bash
# Configure rate limiting
# Redis-based rate limiting
# Per-user limits
```

### Caching Strategy

```bash
# Redis for session storage
# CDN for static assets
# Database query caching
```

## Deployment Checklist

### Pre-Deployment

- [ ] Environment variables configured
- [ ] Database setup and migrations run
- [ ] Smart contracts compiled and tested
- [ ] Tests passing
- [ ] Security review completed
- [ ] Backup strategy in place

### Post-Deployment

- [ ] Services running and healthy
- [ ] Monitoring enabled
- [ ] Log aggregation configured
- [ ] Alerts configured
- [ ] Documentation updated
- [ ] Team notified

### Rollback Plan

```bash
# Quick rollback commands
git checkout previous_tag
docker-compose down
docker-compose up -d

# Database rollback
pg_dump backup.sql | psql database
```

## Support

For deployment issues and questions:

1. **Documentation**: Check this guide and API documentation
2. **GitHub Issues**: Open an issue on the repository
3. **Community**: Join the Flashware Discord community
4. **Support**: Contact the development team at support@flashware.dev

---

Deploy Flashware v1.0 and start building flash loan strategies on Sui! 🚀