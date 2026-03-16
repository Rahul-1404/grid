#!/usr/bin/env bash
set -euo pipefail

# Grid Automated Test Runner
# Usage: bash tests/run-tests.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$(dirname "$FRONTEND_DIR")/backend"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo "Cleaning up..."
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  echo "Done."
}
trap cleanup EXIT

echo -e "${YELLOW}=== Grid Automated QA ===${NC}"
echo ""

# 1. Start backend if not running
if curl -s http://localhost:3001/api/agents > /dev/null 2>&1; then
  echo -e "${GREEN}Backend already running on :3001${NC}"
else
  echo "Starting backend..."
  cd "$BACKEND_DIR"
  npm run dev > /tmp/grid-backend.log 2>&1 &
  BACKEND_PID=$!
  echo "  Waiting for backend (PID $BACKEND_PID)..."
  for i in $(seq 1 15); do
    if curl -s http://localhost:3001/api/agents > /dev/null 2>&1; then
      echo -e "  ${GREEN}Backend ready${NC}"
      break
    fi
    sleep 1
  done
  if ! curl -s http://localhost:3001/api/agents > /dev/null 2>&1; then
    echo -e "  ${RED}Backend failed to start. Check /tmp/grid-backend.log${NC}"
  fi
fi

# 2. Start frontend if not running
if curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo -e "${GREEN}Frontend already running on :5173${NC}"
else
  echo "Starting frontend dev server..."
  cd "$FRONTEND_DIR"
  npm run dev > /tmp/grid-frontend.log 2>&1 &
  FRONTEND_PID=$!
  echo "  Waiting for frontend (PID $FRONTEND_PID)..."
  for i in $(seq 1 20); do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
      echo -e "  ${GREEN}Frontend ready${NC}"
      break
    fi
    sleep 1
  done
  if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "  ${RED}Frontend failed to start. Check /tmp/grid-frontend.log${NC}"
  fi
fi

echo ""

# 3. Create screenshots dir
mkdir -p "$FRONTEND_DIR/tests/screenshots"

# 4. Run Playwright E2E tests
echo -e "${YELLOW}--- E2E Tests (Playwright) ---${NC}"
cd "$FRONTEND_DIR"
npx playwright test tests/e2e.spec.ts --reporter=list 2>&1 || true

echo ""

# 5. Run store unit tests
echo -e "${YELLOW}--- Store Unit Tests ---${NC}"
npx playwright test tests/stores.test.ts --reporter=list 2>&1 || true

echo ""

# 6. Summary
echo -e "${YELLOW}=== Test Run Complete ===${NC}"
echo "Screenshots saved to: tests/screenshots/"
echo "HTML report: npx playwright show-report"
