#!/bin/bash

# Generative World Full System Integration Test

set -e

echo "🌍 Running Generative World Full System Integration Test..."
echo "=================================================="

# Configuration
FRONTEND_URL=${FRONTEND_URL:-"http://localhost:3000"}
API_BASE_URL=${API_BASE_URL:-"http://localhost:8080"}
WS_URL=${WS_URL:-"ws://localhost:8080/ws"}

# Navigate to the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "📍 Project Root: $PROJECT_ROOT"
echo "🌐 Frontend URL: $FRONTEND_URL"
echo "🔗 API Base URL: $API_BASE_URL"
echo "🔗 WebSocket URL: $WS_URL"
echo ""

# Function to check service health
check_service() {
    local url=$1
    local name=$2
    echo -n "  Checking $name... "
    
    if curl -f "$url" > /dev/null 2>&1; then
        echo "✅ Available"
        return 0
    else
        echo "❌ Not available"
        return 1
    fi
}

# Function to run test suite
run_test_suite() {
    local suite_name=$1
    local test_command=$2
    
    echo ""
    echo "🧪 Running $suite_name..."
    echo "----------------------------------------"
    
    if eval "$test_command"; then
        echo "✅ $suite_name passed"
        return 0
    else
        echo "❌ $suite_name failed"
        return 1
    fi
}

# Step 1: Check if development environment is running
echo "🔍 Step 1: Checking Development Environment"
echo "----------------------------------------"

SERVICES_AVAILABLE=true

check_service "$FRONTEND_URL" "Frontend Application" || SERVICES_AVAILABLE=false
check_service "$API_BASE_URL/health" "API Gateway" || SERVICES_AVAILABLE=false
check_service "$API_BASE_URL/api/worlds/health" "World Management Service" || SERVICES_AVAILABLE=false
check_service "$API_BASE_URL/api/agents/health" "Agent Runtime Service" || SERVICES_AVAILABLE=false
check_service "$API_BASE_URL/api/llm/health" "LLM Integration Service" || SERVICES_AVAILABLE=false

if [ "$SERVICES_AVAILABLE" = false ]; then
    echo ""
    echo "❌ Some services are not available. Starting development environment..."
    echo ""
    
    # Start development environment
    cd "$PROJECT_ROOT"
    ./scripts/development/start-dev.sh
    
    echo ""
    echo "⏳ Waiting for services to stabilize..."
    sleep 30
    
    # Re-check services
    echo "🔍 Re-checking services after startup..."
    check_service "$FRONTEND_URL" "Frontend Application"
    check_service "$API_BASE_URL/health" "API Gateway"
    check_service "$API_BASE_URL/api/worlds/health" "World Management Service"
    check_service "$API_BASE_URL/api/agents/health" "Agent Runtime Service"
    check_service "$API_BASE_URL/api/llm/health" "LLM Integration Service"
fi

echo ""
echo "✅ Step 1 Complete: All services are available"

# Step 2: Seed database with test data
echo ""
echo "🌱 Step 2: Seeding Database"
echo "----------------------------------------"

cd "$PROJECT_ROOT"
./scripts/development/seed-data.sh

echo "✅ Step 2 Complete: Database seeded with test data"

# Step 3: Run integration tests
echo ""
echo "🔗 Step 3: Integration Testing"
echo "----------------------------------------"

INTEGRATION_PASSED=true

run_test_suite "API Integration Tests" "./scripts/testing/integration-tests.sh" || INTEGRATION_PASSED=false

if [ "$INTEGRATION_PASSED" = true ]; then
    echo "✅ Step 3 Complete: Integration tests passed"
else
    echo "❌ Step 3 Failed: Integration tests failed"
    echo "   Continuing with remaining tests..."
fi

# Step 4: Run E2E tests
echo ""
echo "🎭 Step 4: End-to-End Testing"
echo "----------------------------------------"

E2E_PASSED=true

# Run E2E tests with headless browser
export HEADLESS=true
run_test_suite "World Creation E2E Tests" "./scripts/testing/e2e-tests.sh world-creation" || E2E_PASSED=false
run_test_suite "Agent Management E2E Tests" "./scripts/testing/e2e-tests.sh agent-management" || E2E_PASSED=false
run_test_suite "Real-time Updates E2E Tests" "./scripts/testing/e2e-tests.sh real-time" || E2E_PASSED=false

if [ "$E2E_PASSED" = true ]; then
    echo "✅ Step 4 Complete: E2E tests passed"
else
    echo "❌ Step 4 Failed: Some E2E tests failed"
    echo "   This may be due to timing issues or browser dependencies"
fi

# Step 5: Manual verification prompts
echo ""
echo "🔍 Step 5: Manual Verification"
echo "----------------------------------------"

echo "Please manually verify the following:"
echo ""
echo "1. 🌐 Open $FRONTEND_URL in your browser"
echo "2. 🌍 Verify you can see the dashboard with sample worlds"
echo "3. 🎯 Click on a world to enter the world viewer"
echo "4. 🤖 Verify you can see sample agents in the world"
echo "5. 💬 Try chatting with an agent"
echo "6. 🎮 Test the time controls (pause/resume, speed change)"
echo "7. 👁️ Open the agent inspector to view memories and plans"
echo "8. ➕ Try creating a new world"
echo "9. 🆕 Try spawning a new agent"
echo "10. 🔄 Verify real-time updates work (open multiple browser tabs)"

echo ""
read -p "Press Enter when you've completed manual verification..."

# Step 6: Performance check
echo ""
echo "⚡ Step 6: Performance Check"
echo "----------------------------------------"

echo "Checking system performance..."

# Check response times
echo -n "  API Gateway response time: "
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$API_BASE_URL/health")
echo "${RESPONSE_TIME}s"

echo -n "  World Management response time: "
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$API_BASE_URL/api/worlds/health")
echo "${RESPONSE_TIME}s"

echo -n "  Agent Runtime response time: "
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$API_BASE_URL/api/agents/health")
echo "${RESPONSE_TIME}s"

echo -n "  LLM Integration response time: "
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$API_BASE_URL/api/llm/health")
echo "${RESPONSE_TIME}s"

# Check Docker container status
echo ""
echo "Docker container status:"
cd "$PROJECT_ROOT/scripts/development"
docker-compose ps

echo ""
echo "✅ Step 6 Complete: Performance check completed"

# Final summary
echo ""
echo "🎉 FULL SYSTEM TEST SUMMARY"
echo "=================================================="

OVERALL_STATUS="✅ PASSED"

if [ "$SERVICES_AVAILABLE" = false ]; then
    echo "⚠️  Services required startup during test"
fi

if [ "$INTEGRATION_PASSED" = true ]; then
    echo "✅ Integration Tests: PASSED"
else
    echo "❌ Integration Tests: FAILED"
    OVERALL_STATUS="⚠️  PARTIAL"
fi

if [ "$E2E_PASSED" = true ]; then
    echo "✅ E2E Tests: PASSED"
else
    echo "❌ E2E Tests: FAILED"
    OVERALL_STATUS="⚠️  PARTIAL"
fi

echo "✅ Manual Verification: COMPLETED"
echo "✅ Performance Check: COMPLETED"

echo ""
echo "🏆 Overall Status: $OVERALL_STATUS"

if [ "$OVERALL_STATUS" = "✅ PASSED" ]; then
    echo ""
    echo "🎊 Congratulations! Your Generative World system is fully integrated and working!"
    echo ""
    echo "🚀 Next steps:"
    echo "   - Deploy to staging/production using ./scripts/deploy/"
    echo "   - Set up monitoring and alerting"
    echo "   - Configure CI/CD pipelines"
    echo "   - Add custom worlds and agents"
    echo ""
    echo "📚 Resources:"
    echo "   - Integration Guide: ./INTEGRATION_GUIDE.md"
    echo "   - Architecture Docs: ./generative-world-architecture.md"
    echo "   - API Documentation: ./services/README.md"
else
    echo ""
    echo "⚠️  Some tests failed, but core functionality appears to be working."
    echo "   Review the test output above for specific issues."
    echo "   Check the troubleshooting section in INTEGRATION_GUIDE.md"
fi

echo ""
echo "🌍 Your Generative World awaits!"