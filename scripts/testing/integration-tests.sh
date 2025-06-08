#!/bin/bash

# Generative World Integration Testing Script

set -e

echo "🧪 Running Generative World Integration Tests..."

# Configuration
API_BASE_URL=${API_BASE_URL:-"http://localhost:8080"}
WS_URL=${WS_URL:-"ws://localhost:8080/ws"}
TEST_TIMEOUT=${TEST_TIMEOUT:-"300000"}

# Navigate to the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TESTS_DIR="$PROJECT_ROOT/tests"

echo "📍 Running tests from: $TESTS_DIR"
echo "🔗 API Base URL: $API_BASE_URL"
echo "🔗 WebSocket URL: $WS_URL"

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

# Check all required services
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
export API_BASE_URL="$API_BASE_URL"
export WS_URL="$WS_URL"
export NODE_ENV="test"

echo ""
echo "🧪 Running integration tests..."

# Run integration tests with detailed output
npm test -- \
    --testPathPattern="integration/" \
    --verbose \
    --testTimeout="$TEST_TIMEOUT" \
    --detectOpenHandles \
    --forceExit

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All integration tests passed!"
else
    echo "❌ Some integration tests failed (exit code: $TEST_EXIT_CODE)"
fi

echo ""
echo "📊 Test Summary:"
echo "  Test Directory: $TESTS_DIR"
echo "  API Base URL: $API_BASE_URL"
echo "  WebSocket URL: $WS_URL"
echo "  Exit Code: $TEST_EXIT_CODE"

exit $TEST_EXIT_CODE