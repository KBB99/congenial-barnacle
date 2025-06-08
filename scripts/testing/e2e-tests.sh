#!/bin/bash

# Generative World E2E Testing Script

set -e

echo "🎭 Running Generative World E2E Tests..."

# Configuration
FRONTEND_URL=${FRONTEND_URL:-"http://localhost:3000"}
API_BASE_URL=${API_BASE_URL:-"http://localhost:8080"}
HEADLESS=${HEADLESS:-"true"}
TEST_TIMEOUT=${TEST_TIMEOUT:-"300000"}

# Navigate to the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TESTS_DIR="$PROJECT_ROOT/tests"

echo "📍 Running E2E tests from: $TESTS_DIR"
echo "🌐 Frontend URL: $FRONTEND_URL"
echo "🔗 API Base URL: $API_BASE_URL"
echo "👻 Headless mode: $HEADLESS"

# Check if services are running
echo "🔍 Checking if services are available..."

check_service() {
    local url=$1
    local name=$2
    local max_retries=30
    local retry=0

    while [ $retry -lt $max_retries ]; do
        if curl -f "$url" > /dev/null 2>&1; then
            echo "  ✅ $name is available"
            return 0
        fi
        echo "  ⏳ Waiting for $name... (attempt $((retry + 1))/$max_retries)"
        sleep 2
        retry=$((retry + 1))
    done

    echo "  ❌ $name is not available after $max_retries attempts"
    return 1
}

# Check frontend
check_service "$FRONTEND_URL" "Frontend Application"

# Check backend services
check_service "$API_BASE_URL/health" "API Gateway"
check_service "$API_BASE_URL/api/worlds/health" "World Management Service"
check_service "$API_BASE_URL/api/agents/health" "Agent Runtime Service"
check_service "$API_BASE_URL/api/llm/health" "LLM Integration Service"

# Navigate to tests directory
cd "$TESTS_DIR"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing test dependencies..."
    npm install
fi

# Set environment variables for tests
export FRONTEND_URL="$FRONTEND_URL"
export API_BASE_URL="$API_BASE_URL"
export HEADLESS="$HEADLESS"
export NODE_ENV="test"

echo ""
echo "🎭 Running E2E tests..."

# Check if we should run specific test suites
if [ "$1" = "world-creation" ]; then
    echo "🌍 Running World Creation E2E tests..."
    npm test -- \
        --testPathPattern="e2e/world-creation.test.ts" \
        --verbose \
        --testTimeout="$TEST_TIMEOUT" \
        --detectOpenHandles \
        --forceExit
elif [ "$1" = "agent-management" ]; then
    echo "🤖 Running Agent Management E2E tests..."
    npm test -- \
        --testPathPattern="e2e/agent-management.test.ts" \
        --verbose \
        --testTimeout="$TEST_TIMEOUT" \
        --detectOpenHandles \
        --forceExit
elif [ "$1" = "real-time" ]; then
    echo "⚡ Running Real-time Updates E2E tests..."
    npm test -- \
        --testPathPattern="e2e/real-time-updates.test.ts" \
        --verbose \
        --testTimeout="$TEST_TIMEOUT" \
        --detectOpenHandles \
        --forceExit
else
    echo "🎭 Running all E2E tests..."
    npm test -- \
        --testPathPattern="e2e/" \
        --verbose \
        --testTimeout="$TEST_TIMEOUT" \
        --detectOpenHandles \
        --forceExit \
        --runInBand
fi

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All E2E tests passed!"
else
    echo "❌ Some E2E tests failed (exit code: $TEST_EXIT_CODE)"
fi

echo ""
echo "📊 Test Summary:"
echo "  Test Directory: $TESTS_DIR"
echo "  Frontend URL: $FRONTEND_URL"
echo "  API Base URL: $API_BASE_URL"
echo "  Headless Mode: $HEADLESS"
echo "  Exit Code: $TEST_EXIT_CODE"

echo ""
echo "💡 Usage examples:"
echo "  Run all E2E tests:           ./scripts/testing/e2e-tests.sh"
echo "  Run world creation tests:    ./scripts/testing/e2e-tests.sh world-creation"
echo "  Run agent management tests:  ./scripts/testing/e2e-tests.sh agent-management"
echo "  Run real-time tests:         ./scripts/testing/e2e-tests.sh real-time"
echo "  Run with visible browser:    HEADLESS=false ./scripts/testing/e2e-tests.sh"

exit $TEST_EXIT_CODE