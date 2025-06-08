#!/bin/bash

# Generative World Infrastructure Deployment Script
# This script automates the deployment of the Generative World infrastructure

set -e  # Exit on any error

# Configuration
PROJECT_NAME="generative-world"
ENVIRONMENT="dev"
AWS_REGION="us-east-1"
STATE_BUCKET="${PROJECT_NAME}-terraform-state-${ENVIRONMENT}"
LOCK_TABLE="${PROJECT_NAME}-terraform-locks-${ENVIRONMENT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials are not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create Terraform backend resources
create_backend() {
    log_info "Creating Terraform backend resources..."
    
    # Check if S3 bucket exists
    if aws s3 ls "s3://${STATE_BUCKET}" 2>&1 | grep -q 'NoSuchBucket'; then
        log_info "Creating S3 bucket for Terraform state: ${STATE_BUCKET}"
        aws s3 mb "s3://${STATE_BUCKET}" --region "${AWS_REGION}"
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "${STATE_BUCKET}" \
            --versioning-configuration Status=Enabled
        
        # Enable server-side encryption
        aws s3api put-bucket-encryption \
            --bucket "${STATE_BUCKET}" \
            --server-side-encryption-configuration '{
                "Rules": [
                    {
                        "ApplyServerSideEncryptionByDefault": {
                            "SSEAlgorithm": "AES256"
                        }
                    }
                ]
            }'
        
        log_success "S3 bucket created and configured"
    else
        log_info "S3 bucket already exists: ${STATE_BUCKET}"
    fi
    
    # Check if DynamoDB table exists
    if ! aws dynamodb describe-table --table-name "${LOCK_TABLE}" --region "${AWS_REGION}" &> /dev/null; then
        log_info "Creating DynamoDB table for state locking: ${LOCK_TABLE}"
        aws dynamodb create-table \
            --table-name "${LOCK_TABLE}" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
            --region "${AWS_REGION}"
        
        # Wait for table to be active
        log_info "Waiting for DynamoDB table to be active..."
        aws dynamodb wait table-exists --table-name "${LOCK_TABLE}" --region "${AWS_REGION}"
        
        log_success "DynamoDB table created"
    else
        log_info "DynamoDB table already exists: ${LOCK_TABLE}"
    fi
}

# Deploy infrastructure
deploy_infrastructure() {
    log_info "Deploying infrastructure..."
    
    # Navigate to dev environment
    cd "environments/${ENVIRONMENT}"
    
    # Initialize Terraform
    log_info "Initializing Terraform..."
    terraform init -backend-config=backend-config.hcl
    
    # Validate configuration
    log_info "Validating Terraform configuration..."
    terraform validate
    
    # Plan deployment
    log_info "Planning Terraform deployment..."
    terraform plan -out=tfplan
    
    # Ask for confirmation
    echo
    log_warning "Review the plan above. Do you want to proceed with the deployment? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled by user"
        exit 0
    fi
    
    # Apply deployment
    log_info "Applying Terraform configuration..."
    terraform apply tfplan
    
    # Clean up plan file
    rm -f tfplan
    
    log_success "Infrastructure deployment completed!"
}

# Display outputs
show_outputs() {
    log_info "Infrastructure outputs:"
    echo
    terraform output
    echo
    
    # Get key outputs
    CLOUDFRONT_URL=$(terraform output -raw cloudfront_domain_name 2>/dev/null || echo "Not available")
    API_URL=$(terraform output -raw api_base_url 2>/dev/null || echo "Not available")
    WEBSOCKET_URL=$(terraform output -raw websocket_url 2>/dev/null || echo "Not available")
    
    log_success "Deployment Summary:"
    echo "  Application URL: https://${CLOUDFRONT_URL}"
    echo "  API Base URL: ${API_URL}"
    echo "  WebSocket URL: ${WEBSOCKET_URL}"
    echo
    log_info "Next steps:"
    echo "  1. Build and push container images to ECR"
    echo "  2. Update ECS task definitions with image URIs"
    echo "  3. Deploy application code to the infrastructure"
    echo "  4. Configure monitoring alerts and notifications"
}

# Main execution
main() {
    log_info "Starting Generative World infrastructure deployment"
    log_info "Environment: ${ENVIRONMENT}"
    log_info "AWS Region: ${AWS_REGION}"
    echo
    
    check_prerequisites
    create_backend
    deploy_infrastructure
    show_outputs
    
    log_success "Deployment script completed successfully!"
}

# Handle script interruption
trap 'log_error "Script interrupted"; exit 1' INT TERM

# Run main function
main "$@"