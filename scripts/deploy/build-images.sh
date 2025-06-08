#!/bin/bash

# Generative World Container Image Build Script

set -e

echo "🐳 Building Generative World Container Images..."

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
ECR_REGISTRY=${ECR_REGISTRY:-"your-account-id.dkr.ecr.us-east-1.amazonaws.com"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install AWS CLI and try again."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "📍 Building from: $PROJECT_ROOT"

# Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# Build frontend image
echo "🏗️ Building frontend image..."
docker build -t generative-world-frontend:$IMAGE_TAG ./frontend
docker tag generative-world-frontend:$IMAGE_TAG $ECR_REGISTRY/generative-world-frontend:$IMAGE_TAG

# Build backend service images
echo "🏗️ Building LLM integration service image..."
docker build -t generative-world-llm-integration:$IMAGE_TAG ./services/llm-integration
docker tag generative-world-llm-integration:$IMAGE_TAG $ECR_REGISTRY/generative-world-llm-integration:$IMAGE_TAG

echo "🏗️ Building world management service image..."
docker build -t generative-world-world-management:$IMAGE_TAG ./services/world-management
docker tag generative-world-world-management:$IMAGE_TAG $ECR_REGISTRY/generative-world-world-management:$IMAGE_TAG

echo "🏗️ Building agent runtime service image..."
docker build -t generative-world-agent-runtime:$IMAGE_TAG ./services/agent-runtime
docker tag generative-world-agent-runtime:$IMAGE_TAG $ECR_REGISTRY/generative-world-agent-runtime:$IMAGE_TAG

# Push images to ECR
echo "📤 Pushing images to ECR..."

echo "  - Pushing frontend image..."
docker push $ECR_REGISTRY/generative-world-frontend:$IMAGE_TAG

echo "  - Pushing LLM integration service image..."
docker push $ECR_REGISTRY/generative-world-llm-integration:$IMAGE_TAG

echo "  - Pushing world management service image..."
docker push $ECR_REGISTRY/generative-world-world-management:$IMAGE_TAG

echo "  - Pushing agent runtime service image..."
docker push $ECR_REGISTRY/generative-world-agent-runtime:$IMAGE_TAG

echo ""
echo "✅ All images built and pushed successfully!"
echo ""
echo "📋 Image URIs:"
echo "  Frontend:           $ECR_REGISTRY/generative-world-frontend:$IMAGE_TAG"
echo "  LLM Integration:    $ECR_REGISTRY/generative-world-llm-integration:$IMAGE_TAG"
echo "  World Management:   $ECR_REGISTRY/generative-world-world-management:$IMAGE_TAG"
echo "  Agent Runtime:      $ECR_REGISTRY/generative-world-agent-runtime:$IMAGE_TAG"
echo ""
echo "🚀 Images are ready for deployment!"