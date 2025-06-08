#!/bin/bash

# Generative World Environment Setup Script

set -e

echo "🔧 Setting up Generative World Environment..."

# Configuration
ENVIRONMENT=${1:-"dev"}
AWS_REGION=${AWS_REGION:-"us-east-1"}
PROJECT_NAME="generative-world"

if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "prod" ]; then
    echo "❌ Invalid environment. Use: dev, staging, or prod"
    echo "Usage: $0 <environment>"
    exit 1
fi

echo "🌍 Environment: $ENVIRONMENT"
echo "📍 Region: $AWS_REGION"

# Check if required tools are available
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install AWS CLI and try again."
    exit 1
fi

if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed. Please install Terraform and try again."
    exit 1
fi

# Check AWS credentials
echo "🔐 Checking AWS credentials..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✅ AWS Account ID: $AWS_ACCOUNT_ID"

# Create ECR repositories if they don't exist
echo "📦 Setting up ECR repositories..."

REPOSITORIES=(
    "$PROJECT_NAME-frontend"
    "$PROJECT_NAME-llm-integration"
    "$PROJECT_NAME-world-management"
    "$PROJECT_NAME-agent-runtime"
)

for repo in "${REPOSITORIES[@]}"; do
    echo "  - Checking repository: $repo"
    if ! aws ecr describe-repositories --repository-names "$repo" --region "$AWS_REGION" > /dev/null 2>&1; then
        echo "    Creating repository: $repo"
        aws ecr create-repository \
            --repository-name "$repo" \
            --region "$AWS_REGION" \
            --image-scanning-configuration scanOnPush=true > /dev/null
    else
        echo "    Repository exists: $repo"
    fi
done

# Set up Terraform backend S3 bucket
BACKEND_BUCKET="$PROJECT_NAME-terraform-state-$AWS_ACCOUNT_ID-$AWS_REGION"
echo "🗄️ Setting up Terraform backend bucket: $BACKEND_BUCKET"

if ! aws s3api head-bucket --bucket "$BACKEND_BUCKET" --region "$AWS_REGION" > /dev/null 2>&1; then
    echo "  Creating S3 bucket for Terraform state..."
    aws s3api create-bucket \
        --bucket "$BACKEND_BUCKET" \
        --region "$AWS_REGION" > /dev/null
    
    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "$BACKEND_BUCKET" \
        --versioning-configuration Status=Enabled > /dev/null
    
    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket "$BACKEND_BUCKET" \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }]
        }' > /dev/null
else
    echo "  Terraform state bucket already exists"
fi

# Set up DynamoDB table for Terraform locking
LOCK_TABLE="$PROJECT_NAME-terraform-locks"
echo "🔒 Setting up Terraform lock table: $LOCK_TABLE"

if ! aws dynamodb describe-table --table-name "$LOCK_TABLE" --region "$AWS_REGION" > /dev/null 2>&1; then
    echo "  Creating DynamoDB table for Terraform locks..."
    aws dynamodb create-table \
        --table-name "$LOCK_TABLE" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "$AWS_REGION" > /dev/null
    
    # Wait for table to be active
    echo "  Waiting for table to be active..."
    aws dynamodb wait table-exists --table-name "$LOCK_TABLE" --region "$AWS_REGION"
else
    echo "  Terraform lock table already exists"
fi

echo ""
echo "✅ Environment setup completed successfully!"
echo ""
echo "📋 Summary:"
echo "  Environment: $ENVIRONMENT"
echo "  AWS Region: $AWS_REGION"
echo "  AWS Account: $AWS_ACCOUNT_ID"
echo "  ECR Registry: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
echo "  Terraform State Bucket: $BACKEND_BUCKET"
echo "  Terraform Lock Table: $LOCK_TABLE"
echo ""
echo "🚀 Ready to deploy! Run the following commands:"
echo "  1. Build images: ./scripts/deploy/build-images.sh"
echo "  2. Deploy services: ./scripts/deploy/deploy-services.sh"