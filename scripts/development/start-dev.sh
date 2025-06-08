#!/bin/bash

# Generative World Development Environment Startup Script

set -e

echo "🌍 Starting Generative World Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Set environment variables if not already set
export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-"dummy"}
export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-"dummy"}

# Navigate to the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📦 Building and starting services..."

# Stop any existing containers
docker-compose down --remove-orphans

# Build and start services
docker-compose up --build -d

echo "⏳ Waiting for services to be healthy..."

# Wait for database to be ready
echo "  - Waiting for PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    sleep 2
done

# Wait for Redis to be ready
echo "  - Waiting for Redis..."
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    sleep 2
done

# Wait for backend services to be healthy
echo "  - Waiting for LLM Integration service..."
until curl -f http://localhost:3001/health > /dev/null 2>&1; do
    sleep 5
done

echo "  - Waiting for World Management service..."
until curl -f http://localhost:3002/health > /dev/null 2>&1; do
    sleep 5
done

echo "  - Waiting for Agent Runtime service..."
until curl -f http://localhost:3003/health > /dev/null 2>&1; do
    sleep 5
done

echo "  - Waiting for API Gateway..."
until curl -f http://localhost:8080/health > /dev/null 2>&1; do
    sleep 5
done

echo ""
echo "✅ All services are running!"
echo ""
echo "🔗 Service URLs:"
echo "  Frontend:           http://localhost:3000"
echo "  API Gateway:        http://localhost:8080"
echo "  World Management:   http://localhost:3002"
echo "  Agent Runtime:      http://localhost:3003"
echo "  LLM Integration:    http://localhost:3001"
echo "  PostgreSQL:         localhost:5432"
echo "  Redis:              localhost:6379"
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "📝 To view logs:"
echo "  All services:       docker-compose logs -f"
echo "  Specific service:   docker-compose logs -f <service-name>"
echo ""
echo "🛑 To stop all services:"
echo "  docker-compose down"
echo ""
echo "🌍 Your Generative World is ready for development!"