#!/bin/bash

# Generative World Service Deployment Script

set -e

echo "🚀 Deploying Generative World Services..."

# Configuration
ENVIRONMENT=${ENVIRONMENT:-"dev"}
AWS_REGION=${AWS_REGION:-"us-east-1"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}

# Check if required tools are available
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install AWS CLI and try again."
    exit 1
fi

if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed. Please install Terraform and try again."
    exit 1
fi

# Navigate to infrastructure directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/../../infrastructure" && pwd)"
ENV_DIR="$INFRA_DIR/environments/$ENVIRONMENT"

if [ ! -d "$ENV_DIR" ]; then
    echo "❌ Environment directory not found: $ENV_DIR"
    exit 1
fi

cd "$ENV_DIR"

echo "📍 Deploying from: $ENV_DIR"
echo "🌍 Environment: $ENVIRONMENT"
echo "🏷️ Image Tag: $IMAGE_TAG"

# Initialize Terraform
echo "🔧 Initializing Terraform..."
terraform init -backend-config=backend-config.hcl

# Plan deployment
echo "📋 Planning deployment..."
terraform plan \
    -var="environment=$ENVIRONMENT" \
    -var="image_tag=$IMAGE_TAG" \
    -out=tfplan

# Apply deployment
echo "🚀 Applying deployment..."
terraform apply tfplan

# Get outputs
echo ""
echo "📊 Deployment outputs:"
terraform output

# Update ECS services to use new images
echo ""
echo "🔄 Updating ECS services..."

# Get cluster name from Terraform output
CLUSTER_NAME=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "generative-world-$ENVIRONMENT")

# Update LLM Integration service
echo "  - Updating LLM Integration service..."
aws ecs update-service \
    --cluster "$CLUSTER_NAME" \
    --service "generative-world-llm-integration-$ENVIRONMENT" \
    --force-new-deployment \
    --region "$AWS_REGION" > /dev/null

# Update World Management service
echo "  - Updating World Management service..."
aws ecs update-service \
    --cluster "$CLUSTER_NAME" \
    --service "generative-world-world-management-$ENVIRONMENT" \
    --force-new-deployment \
    --region "$AWS_REGION" > /dev/null

# Update Agent Runtime service
echo "  - Updating Agent Runtime service..."
aws ecs update-service \
    --cluster "$CLUSTER_NAME" \
    --service "generative-world-agent-runtime-$ENVIRONMENT" \
    --force-new-deployment \
    --region "$AWS_REGION" > /dev/null

# Wait for services to stabilize
echo ""
echo "⏳ Waiting for services to stabilize..."

aws ecs wait services-stable \
    --cluster "$CLUSTER_NAME" \
    --services \
        "generative-world-llm-integration-$ENVIRONMENT" \
        "generative-world-world-management-$ENVIRONMENT" \
        "generative-world-agent-runtime-$ENVIRONMENT" \
    --region "$AWS_REGION"

# Check service health
echo ""
echo "🏥 Checking service health..."

# Get load balancer DNS from Terraform output
ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "")

if [ -n "$ALB_DNS" ]; then
    echo "  - Testing load balancer health: $ALB_DNS"
    
    # Wait a bit for DNS propagation
    sleep 30
    
    # Test health endpoint
    if curl -f "http://$ALB_DNS/health" > /dev/null 2>&1; then
        echo "  ✅ Load balancer is healthy"
    else
        echo "  ⚠️ Load balancer health check failed (may need more time)"
    fi
else
    echo "  ⚠️ Could not retrieve load balancer DNS"
fi

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🔗 Service URLs:"
if [ -n "$ALB_DNS" ]; then
    echo "  Application: http://$ALB_DNS"
    echo "  API:         http://$ALB_DNS/api"
    echo "  Health:      http://$ALB_DNS/health"
fi

echo ""
echo "📊 To check service status:"
echo "  aws ecs describe-services --cluster $CLUSTER_NAME --region $AWS_REGION"
echo ""
echo "📝 To view service logs:"
echo "  aws logs tail /ecs/generative-world-llm-integration-$ENVIRONMENT --follow --region $AWS_REGION"
echo "  aws logs tail /ecs/generative-world-world-management-$ENVIRONMENT --follow --region $AWS_REGION"
echo "  aws logs tail /ecs/generative-world-agent-runtime-$ENVIRONMENT --follow --region $AWS_REGION"
echo ""
echo "🌍 Your Generative World is deployed and running!"