#!/bin/bash

# Flashware v1.0 - Environment Setup Script
# Sets up all required dependencies and configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')] SETUP: $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check if running as root for system packages
check_system_requirements() {
    log "Checking system requirements..."
    
    # Check OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log "Linux detected"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        log "macOS detected"
    else
        error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    
    # Check required commands
    local required_commands=("curl" "git" "node" "npm")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "$cmd is not installed. Please install $cmd first."
            exit 1
        fi
    done
    
    success "System requirements check passed"
}

# Install Node.js dependencies
install_nodejs_deps() {
    log "Installing Node.js dependencies..."
    
    # Install latest Node.js if needed
    if ! node --version | grep -E "v1[8-9]|v[2-9][0-9]" &> /dev/null; then
        warning "Node.js version might be too old. Consider upgrading to Node.js 18+"
    fi
    
    # Install global packages
    log "Installing global npm packages..."
    
    npm install -g @suiet/wallet-adapter || warning "Failed to install @suiet/wallet-adapter globally"
    npm install -g @mysten/sui.js || warning "Failed to install @mysten/sui.js globally"
    
    success "Node.js dependencies installed"
}

# Install Sui CLI
install_sui_cli() {
    log "Installing Sui CLI..."
    
    if ! command -v sui &> /dev/null; then
        log "Sui CLI not found, installing..."
        
        # Download and install Sui CLI
        case "$OSTYPE" in
            linux-gnu*)
                curl --proto '=https' --tlsv1.2 -sSf https://install.sui.app | sh -s -- -y
                ;;
            darwin*)
                curl --proto '=https' --tlsv1.2 -sSf https://install.sui.app | sh -s -- -y
                ;;
            *)
                error "Unsupported OS for Sui CLI installation"
                exit 1
                ;;
        esac
        
        # Add to PATH (if not already there)
        if ! echo $PATH | grep -q "$HOME/.cargo/bin"; then
            echo 'export PATH=$PATH:$HOME/.cargo/bin' >> ~/.bashrc
            export PATH=$PATH:$HOME/.cargo/bin
        fi
        
        success "Sui CLI installed"
    else
        log "Sui CLI already installed: $(sui --version)"
    fi
}

# Setup PostgreSQL
setup_postgresql() {
    log "Setting up PostgreSQL..."
    
    if ! command -v psql &> /dev/null; then
        log "PostgreSQL not found, installing..."
        
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Debian/Ubuntu
            if command -v apt-get &> /dev/null; then
                sudo apt-get update
                sudo apt-get install -y postgresql postgresql-contrib
            # RedHat/CentOS
            elif command -v yum &> /dev/null; then
                sudo yum install -y postgresql-server postgresql-contrib
                sudo postgresql-setup initdb
                sudo systemctl enable postgresql
                sudo systemctl start postgresql
            fi
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS with Homebrew
            if command -v brew &> /dev/null; then
                brew install postgresql
                brew services start postgresql
            else
                warning "Please install PostgreSQL manually on macOS"
                return
            fi
        fi
    else
        log "PostgreSQL already installed: $(psql --version)"
    fi
    
    # Start PostgreSQL service
    if command -v systemctl &> /dev/null; then
        sudo systemctl enable postgresql
        sudo systemctl start postgresql
    elif command -v brew &> /dev/null; then
        brew services start postgresql
    fi
    
    success "PostgreSQL setup complete"
}

# Setup tmux for background processes
setup_tmux() {
    log "Setting up tmux for background processes..."
    
    if ! command -v tmux &> /dev/null; then
        log "Installing tmux..."
        
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            if command -v apt-get &> /dev/null; then
                sudo apt-get install -y tmux
            elif command -v yum &> /dev/null; then
                sudo yum install -y tmux
            fi
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            if command -v brew &> /dev/null; then
                brew install tmux
            fi
        fi
    else
        log "tmux already installed: $(tmux -V)"
    fi
    
    success "tmux setup complete"
}

# Setup environment files
setup_env_files() {
    log "Setting up environment files..."
    
    # Backend environment
    if [ ! -f "backend/.env.local" ]; then
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
        success "Created backend/.env.local"
    else
        log "backend/.env.local already exists"
    fi
    
    # Frontend environment
    if [ ! -f "frontend/.env.local" ]; then
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
        success "Created frontend/.env.local"
    else
        log "frontend/.env.local already exists"
    fi
}

# Setup database user and database
setup_database() {
    log "Setting up database user and database..."
    
    # Wait for PostgreSQL to be ready
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if pg_isready -q; then
            break
        fi
        log "Waiting for PostgreSQL to be ready... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    if ! pg_isready -q; then
        error "PostgreSQL is not ready. Please check your PostgreSQL installation."
        exit 1
    fi
    
    # Create user and database
    sudo -u postgres psql -c "CREATE USER flashware WITH PASSWORD 'flashware_password';" 2>/dev/null || log "User 'flashware' already exists"
    sudo -u postgres psql -c "CREATE DATABASE flashware;" 2>/dev/null || log "Database 'flashware' already exists"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE flashware TO flashware;" || log "Database privileges already granted"
    
    success "Database setup complete"
}

# Make scripts executable
make_scripts_executable() {
    log "Making scripts executable..."
    
    chmod +x scripts/*.sh
    success "Scripts made executable"
}

# Main setup function
main() {
    log "Starting Flashware v1.0 environment setup..."
    
    # Change to project directory
    cd "$(dirname "$0")/.."
    
    # Run setup steps
    check_system_requirements
    install_nodejs_deps
    install_sui_cli
    setup_postgresql
    setup_tmux
    setup_env_files
    setup_database
    make_scripts_executable
    
    success "Environment setup complete!"
    
    cat << EOF

🎉 Flashware v1.0 environment is ready!

Next steps:
1. Run: ./scripts/deploy-all.sh
2. Or run components individually:
   - ./scripts/setup-contracts.sh
   - ./scripts/start-services.sh

Environment files created:
- backend/.env.local
- frontend/.env.local

Database setup:
- Database: flashware
- User: flashware
- Password: flashware_password

Ready to deploy Flashware! 🚀
EOF
}

# Run setup
main "$@"