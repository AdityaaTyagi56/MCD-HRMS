#!/bin/bash

# ===========================================
# MCD UNIFIED HRMS - One-Click Start Script
# ===========================================
# This script sets up and runs the entire application
# Works on macOS and Linux

set -e

echo ""
echo "🏛️  MCD UNIFIED HRMS - Starting Setup..."
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo "Please install Node.js 18+ from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}⚠️  Node.js version $NODE_VERSION detected. Version 18+ recommended.${NC}"
fi

echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"

# Navigate to script directory
cd "$(dirname "$0")"

# Step 1: Install Node dependencies
echo ""
echo -e "${BLUE}📦 Installing Node.js dependencies...${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ node_modules already exists, skipping install${NC}"
else
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
fi

# Step 2: Create .env.local if not exists
if [ ! -f ".env.local" ]; then
    echo ""
    echo -e "${BLUE}🔧 Creating .env.local...${NC}"
    cat > .env.local << 'EOF'
API_KEY=hackathon-demo-key
ALLOWED_ORIGINS=http://localhost:7001,http://localhost:7010,http://localhost:7002
PORT=7010
EOF
    echo -e "${GREEN}✓ .env.local created${NC}"
fi

# Step 3: Setup Python ML Service (optional)
setup_python() {
    echo ""
    echo -e "${BLUE}🐍 Setting up Python ML service...${NC}"
    
    cd ml_service
    
    if [ -d ".venv" ]; then
        echo -e "${GREEN}✓ Python venv already exists${NC}"
    else
        if command -v python3 &> /dev/null; then
            python3 -m venv .venv
            echo -e "${GREEN}✓ Python venv created${NC}"
        else
            echo -e "${YELLOW}⚠️  Python3 not found, ML service will be skipped${NC}"
            cd ..
            return 1
        fi
    fi
    
    source .venv/bin/activate
    pip install -q -r requirements.txt
    echo -e "${GREEN}✓ Python dependencies installed${NC}"
    deactivate
    cd ..
    return 0
}

# Kill any existing processes on our ports
cleanup() {
    echo ""
    echo -e "${BLUE}🧹 Cleaning up old processes...${NC}"
    lsof -ti:7001 | xargs kill -9 2>/dev/null || true
    lsof -ti:7010 | xargs kill -9 2>/dev/null || true
    lsof -ti:7002 | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✓ Ports cleared${NC}"
}

cleanup

# Ask about Python ML service
echo ""
read -p "Setup Python ML service for AI features? (y/N): " -n 1 -r
echo ""
PYTHON_SETUP=false
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if setup_python; then
        PYTHON_SETUP=true
    fi
fi

# Step 4: Start all services
echo ""
echo -e "${BLUE}🚀 Starting services...${NC}"
echo ""

# Start API server in background
echo -e "${YELLOW}Starting API server on port 7010...${NC}"
npm run server &
API_PID=$!
sleep 2

# Start ML service if Python is available
if [ "$PYTHON_SETUP" = true ]; then
    echo -e "${YELLOW}Starting ML service on port 7002...${NC}"
    cd ml_service
    source .venv/bin/activate
    python main.py &
    ML_PID=$!
    cd ..
    sleep 2
fi

# Start frontend
echo -e "${YELLOW}Starting frontend on port 7001...${NC}"
npm run dev &
FRONTEND_PID=$!

# Wait for services to start
sleep 3

echo ""
echo "========================================="
echo -e "${GREEN}🎉 MCD HRMS is running!${NC}"
echo "========================================="
echo ""
echo -e "  ${BLUE}Frontend:${NC}    http://localhost:7001"
echo -e "  ${BLUE}API Server:${NC}  http://localhost:7010"
if [ "$PYTHON_SETUP" = true ]; then
echo -e "  ${BLUE}ML Service:${NC}  http://localhost:7002"
fi
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Handle graceful shutdown
cleanup_on_exit() {
    echo ""
    echo -e "${BLUE}Shutting down services...${NC}"
    kill $FRONTEND_PID 2>/dev/null || true
    kill $API_PID 2>/dev/null || true
    [ -n "$ML_PID" ] && kill $ML_PID 2>/dev/null || true
    echo -e "${GREEN}✓ All services stopped${NC}"
    exit 0
}

trap cleanup_on_exit SIGINT SIGTERM

# Keep script running
wait
