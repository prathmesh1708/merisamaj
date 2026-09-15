#!/usr/bin/env bash

# ==============================================================================
#  Meri Samaj - Production Deployment Script
# ==============================================================================

set -euo pipefail

# --- Color Definitions for Output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# --- Configuration & Defaults ---
BRANCH="${DEPLOY_BRANCH:-main}"
PM2_APP_NAME="${PM2_NAME:-merisamaj-backend}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"

# --- Helper Functions ---
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

cleanup_on_failure() {
  log_error "Deployment failed at step: $BASH_COMMAND"
  exit 1
}

trap cleanup_on_failure ERR

echo -e "${CYAN}=====================================================${NC}"
echo -e "${CYAN}          Starting Meri Samaj Deployment             ${NC}"
echo -e "${CYAN}=====================================================${NC}"
echo "Project Path: ${PROJECT_ROOT}"
echo "Target Branch: ${BRANCH}"
echo "PM2 Process Name: ${PM2_APP_NAME}"
echo ""

# ------------------------------------------------------------------------------
# Step 1: Pre-flight Verification
# ------------------------------------------------------------------------------
log_info "Verifying prerequisites (Node, npm, git, pm2)..."

if ! command -v node >/dev/null 2>&1; then
  log_error "Node.js is not installed or not in PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  log_error "npm is not installed or not in PATH."
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  log_error "git is not installed or not in PATH."
  exit 1
fi

log_success "Node $(node -v) and npm $(npm -v) detected."

# Check for .env files
if [ ! -f "${BACKEND_DIR}/.env" ]; then
  log_warn "backend/.env file is missing! Please configure backend/.env for production."
fi

if [ ! -f "${FRONTEND_DIR}/.env" ]; then
  log_warn "frontend/.env file is missing! Please check frontend environment variables."
fi

# ------------------------------------------------------------------------------
# Step 2: Fetch and Pull Latest Changes
# ------------------------------------------------------------------------------
if [ "${SKIP_GIT_PULL:-false}" != "true" ]; then
  log_info "Fetching latest code from Git branch '${BRANCH}'..."
  cd "${PROJECT_ROOT}"
  git fetch origin "${BRANCH}"
  git checkout "${BRANCH}"
  git pull origin "${BRANCH}"
  log_success "Code updated to latest commit $(git rev-parse --short HEAD)."
else
  log_warn "Skipping git pull (SKIP_GIT_PULL=true)."
fi

# ------------------------------------------------------------------------------
# Step 3: Install Backend Dependencies
# ------------------------------------------------------------------------------
log_info "Installing backend dependencies..."
cd "${BACKEND_DIR}"
npm install --no-audit --prefer-offline || npm install
log_success "Backend dependencies installed successfully."

# ------------------------------------------------------------------------------
# Step 4: Install Frontend Dependencies & Build Bundle
# ------------------------------------------------------------------------------
if [ "${SKIP_FRONTEND_BUILD:-false}" != "true" ]; then
  log_info "Installing frontend dependencies..."
  cd "${FRONTEND_DIR}"
  npm install --no-audit --prefer-offline || npm install

  log_info "Building frontend for production with Vite..."
  npm run build
  log_success "Frontend production build complete (frontend/dist)."
else
  log_warn "Skipping frontend build (SKIP_FRONTEND_BUILD=true)."
fi

# ------------------------------------------------------------------------------
# Step 5: Start / Reload Backend Service with PM2
# ------------------------------------------------------------------------------
cd "${BACKEND_DIR}"

if command -v pm2 >/dev/null 2>&1; then
  log_info "Managing PM2 backend service: ${PM2_APP_NAME}..."
  
  if pm2 describe "${PM2_APP_NAME}" >/dev/null 2>&1; then
    log_info "Reloading existing PM2 process '${PM2_APP_NAME}'..."
    pm2 reload "${PM2_APP_NAME}" --update-env || pm2 restart "${PM2_APP_NAME}" --update-env
  else
    log_info "Starting new PM2 process '${PM2_APP_NAME}'..."
    pm2 start index.js --name "${PM2_APP_NAME}"
  fi
  
  pm2 save || true
  log_success "PM2 process '${PM2_APP_NAME}' is up and running."
else
  log_warn "PM2 is not installed globally."
  log_warn "To run backend in background with PM2, install it: npm install -g pm2"
  log_warn "You can manually start backend using: cd backend && npm start"
fi

# ------------------------------------------------------------------------------
# Step 6: Deployment Summary
# ------------------------------------------------------------------------------
echo ""
echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}       Meri Samaj Deployed Successfully! 🚀          ${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo -e "Frontend Build: ${FRONTEND_DIR}/dist"
echo -e "Backend Server: ${BACKEND_DIR}/index.js"
if command -v pm2 >/dev/null 2>&1; then
  echo ""
  pm2 status "${PM2_APP_NAME}" || true
fi
echo ""
