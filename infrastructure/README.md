# Generative World Infrastructure

This repository contains the complete Terraform infrastructure as code for the Generative World system, implementing Phase 1 of the foundation infrastructure setup.

## Architecture Overview

The infrastructure is designed as a scalable, secure, and cost-effective platform for running generative AI agents in persistent world instances. It includes:

- **Networking**: VPC with public/private subnets, security groups, NAT gateways
- **Compute**: ECS Fargate cluster with auto-scaling services
- **Storage**: DynamoDB tables, S3 buckets, ElastiCache Redis
- **Security**: IAM roles/policies, KMS encryption
- **Monitoring**: CloudWatch dashboards, alarms, X-Ray tracing
- **API Gateway**: REST and WebSocket APIs
- **CloudFront**: Global CDN distribution

## Directory Structure

```
infrastructure/
├── modules/                    # Reusable Terraform modules
│   ├── networking/            # VPC, subnets, security groups
│   ├── compute/               # ECS cluster, ALB, auto-scaling
│   ├── storage/               # DynamoDB, S3, ElastiCache
│   ├── security/              # IAM, KMS
│   ├── monitoring/            # CloudWatch, X-Ray
│   ├── api_gateway/           # REST and WebSocket APIs
│   └── cloudfront/            # CDN distribution
├── environments/              # Environment-specific configurations
│   ├── dev/                   # Development environment
│   ├── staging/               # Staging environment (future)
│   └── prod/                  # Production environment (future)
├── shared/                    # Shared configuration
│   ├── providers.tf           # Provider configuration
│   ├── backend.tf             # Backend configuration
│   └── variables.tf           # Common variables
└── README.md                  # This file
```

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.0 installed
3. **AWS Account** with sufficient permissions
4. **S3 Bucket** for Terraform state (see setup instructions below)
5. **DynamoDB Table** for state locking (see setup instructions below)

## Initial Setup

### 1. Create Terraform State Backend

Before deploying the infrastructure, you need to create the S3 bucket and DynamoDB table for Terraform state management:

```bash
# Create S3 bucket for Terraform state
aws s3 mb s3://generative-world-terraform-state-dev --region us-east-1

# Enable versioning on the bucket
aws s3api put-bucket-versioning \
  --bucket generative-world-terraform-state-dev \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name generative-world-terraform-locks-dev \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1
```

### 2. Configure AWS Credentials

Ensure your AWS credentials are configured:

```bash
aws configure
# or
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

## Deployment Instructions

### Development Environment

1. **Navigate to the dev environment:**
   ```bash
   cd infrastructure/environments/dev
   ```

2. **Initialize Terraform:**
   ```bash
   terraform init -backend-config=backend-config.hcl
   ```

3. **Review and customize variables:**
   ```bash
   # Edit terraform.tfvars to customize configuration
   vim terraform.tfvars
   ```

4. **Plan the deployment:**
   ```bash
   terraform plan
   ```

5. **Apply the infrastructure:**
   ```bash
   terraform apply
   ```

6. **Note the outputs:**
   ```bash
   terraform output
   ```

### Key Configuration Options

Edit [`terraform.tfvars`](infrastructure/environments/dev/terraform.tfvars) to customize:

- **Resource Sizing**: CPU, memory, and scaling limits for ECS services
- **Redis Configuration**: Node type and cluster size
- **Domain Configuration**: Custom domains and SSL certificates
- **Network Configuration**: VPC CIDR and availability zones

## Infrastructure Components

### DynamoDB Tables

The following tables are created with the exact schema from the architecture document:

- **Worlds**: World instances with status tracking
- **Agents**: Agent definitions and current state
- **MemoryStreams**: Agent memory with embeddings and importance scoring
- **WorldObjects**: Environment objects and their properties
- **Events**: World events and agent actions
- **Snapshots**: World state snapshots for save/restore

All tables include:
- Point-in-time recovery enabled
- Encryption at rest with KMS
- Global Secondary Indexes for efficient queries
- Pay-per-request billing mode

### ECS Services

Three main services run on Fargate:

1. **World Management Service**: Handles world lifecycle, snapshots, scaling
2. **Agent Runtime Service**: Core agent engine and simulation
3. **LLM Integration Service**: Amazon Bedrock integration and caching

Each service includes:
- Auto-scaling based on CPU and memory utilization
- Health checks and rolling deployments
- CloudWatch logging and X-Ray tracing
- Secure networking in private subnets

### Security Features

- **Encryption**: All data encrypted at rest and in transit
- **IAM**: Least privilege access with service-specific roles
- **VPC**: Private subnets for backend services
- **Security Groups**: Restrictive network access rules
- **KMS**: Customer-managed encryption keys

### Monitoring and Observability

- **CloudWatch Dashboard**: Real-time metrics and visualizations
- **Alarms**: Automated alerting for critical metrics
- **X-Ray Tracing**: Distributed request tracing
- **Structured Logging**: JSON logs for easy analysis
- **SNS Notifications**: Alert delivery via multiple channels

## Post-Deployment Steps

After successful deployment:

1. **Verify Services**: Check ECS services are running healthy
2. **Test APIs**: Verify API Gateway endpoints are accessible
3. **Configure DNS**: Point custom domains to CloudFront (if using)
4. **Set up Monitoring**: Subscribe to SNS alerts
5. **Deploy Applications**: Build and deploy container images

## Scaling and Optimization

The infrastructure is designed to scale automatically:

- **ECS Auto Scaling**: Services scale based on CPU/memory utilization
- **DynamoDB**: On-demand billing scales with usage
- **CloudFront**: Global edge locations for low latency
- **ElastiCache**: Redis caching for performance optimization

## Cost Optimization

Development environment is configured for cost efficiency:

- **Small Instance Types**: t3.micro for Redis, minimal ECS resources
- **Single AZ Redis**: Reduces costs for development
- **CloudFront PriceClass_100**: US/Europe edge locations only
- **Lifecycle Policies**: Automatic archival of old snapshots

## Troubleshooting

### Common Issues

1. **State Lock**: If Terraform state is locked, check DynamoDB table
2. **Permissions**: Ensure AWS credentials have sufficient permissions
3. **Resource Limits**: Check AWS service quotas if deployments fail
4. **DNS Propagation**: Custom domains may take time to propagate

### Useful Commands

```bash
# Check Terraform state
terraform state list

# Import existing resources
terraform import aws_s3_bucket.example bucket-name

# Refresh state
terraform refresh

# Destroy infrastructure (careful!)
terraform destroy
```

## Security Considerations

- **Secrets Management**: Redis auth tokens stored in AWS Secrets Manager
- **Network Security**: Backend services in private subnets only
- **Access Control**: IAM roles follow least privilege principle
- **Encryption**: All data encrypted with customer-managed KMS keys
- **Monitoring**: CloudTrail logs all API calls for audit

## Next Steps

After Phase 1 infrastructure is deployed:

1. **Application Development**: Build and deploy the actual services
2. **CI/CD Pipeline**: Set up automated deployments
3. **Production Environment**: Create staging and prod configurations
4. **Advanced Features**: Add WAF, advanced monitoring, backup strategies
5. **Performance Testing**: Load test the infrastructure

## Support

For issues or questions:

1. Check CloudWatch logs for service errors
2. Review Terraform plan output for configuration issues
3. Consult AWS documentation for service-specific guidance
4. Use AWS Support for infrastructure-related problems

## License

This infrastructure code is part of the Generative World project.