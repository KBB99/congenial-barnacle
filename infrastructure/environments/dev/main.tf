terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }

  backend "s3" {
    # Backend configuration will be provided via backend config file
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Generate Redis auth token
resource "random_password" "redis_auth_token" {
  length  = 32
  special = true
}

# Store Redis auth token in Secrets Manager
resource "aws_secretsmanager_secret" "redis_auth_token" {
  name                    = "${var.project_name}-${var.environment}-redis-auth-token"
  description             = "Redis authentication token"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-auth-token"
  }
}

resource "aws_secretsmanager_secret_version" "redis_auth_token" {
  secret_id     = aws_secretsmanager_secret.redis_auth_token.id
  secret_string = random_password.redis_auth_token.result
}

# Security Module
module "security" {
  source = "../../modules/security"

  project_name              = var.project_name
  environment               = var.environment
  worlds_table_arn          = module.storage.worlds_table_arn
  agents_table_arn          = module.storage.agents_table_arn
  memory_streams_table_arn  = module.storage.memory_streams_table_arn
  world_objects_table_arn   = module.storage.world_objects_table_arn
  events_table_arn          = module.storage.events_table_arn
  snapshots_table_arn       = module.storage.snapshots_table_arn
  world_assets_bucket_arn   = module.storage.world_assets_bucket_arn
  snapshots_bucket_arn      = module.storage.snapshots_bucket_arn
}

# Networking Module
module "networking" {
  source = "../../modules/networking"

  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
}

# Storage Module
module "storage" {
  source = "../../modules/storage"

  project_name                  = var.project_name
  environment                   = var.environment
  kms_key_id                    = module.security.kms_key_id
  private_subnet_ids            = module.networking.private_db_subnet_ids
  redis_security_group_id       = module.networking.redis_security_group_id
  redis_node_type               = var.redis_node_type
  redis_num_cache_nodes         = var.redis_num_cache_nodes
  redis_auth_token              = random_password.redis_auth_token.result
  cloudfront_distribution_arn   = module.cloudfront.cloudfront_distribution_arn
}

# Compute Module
module "compute" {
  source = "../../modules/compute"

  project_name                     = var.project_name
  environment                      = var.environment
  aws_region                       = var.aws_region
  vpc_id                           = module.networking.vpc_id
  public_subnet_ids                = module.networking.public_subnet_ids
  private_subnet_ids               = module.networking.private_app_subnet_ids
  alb_security_group_id            = module.networking.alb_security_group_id
  ecs_security_group_id            = module.networking.ecs_security_group_id
  kms_key_id                       = module.security.kms_key_id
  ecs_task_execution_role_arn      = module.security.ecs_task_execution_role_arn
  ecs_task_role_arn                = module.security.ecs_task_role_arn
  
  # DynamoDB table names
  worlds_table_name                = module.storage.worlds_table_name
  agents_table_name                = module.storage.agents_table_name
  memory_streams_table_name        = module.storage.memory_streams_table_name
  world_objects_table_name         = module.storage.world_objects_table_name
  events_table_name                = module.storage.events_table_name
  snapshots_table_name             = module.storage.snapshots_table_name
  
  # S3 bucket names
  world_assets_bucket_name         = module.storage.world_assets_bucket_name
  snapshots_bucket_name            = module.storage.snapshots_bucket_name
  
  # Redis configuration
  redis_endpoint                   = module.storage.redis_endpoint
  redis_auth_token_secret_arn      = aws_secretsmanager_secret.redis_auth_token.arn
  
  # Container configuration
  world_management_cpu             = var.world_management_cpu
  world_management_memory          = var.world_management_memory
  world_management_desired_count   = var.world_management_desired_count
  world_management_min_capacity    = var.world_management_min_capacity
  world_management_max_capacity    = var.world_management_max_capacity
  
  agent_runtime_cpu                = var.agent_runtime_cpu
  agent_runtime_memory             = var.agent_runtime_memory
  agent_runtime_desired_count      = var.agent_runtime_desired_count
  agent_runtime_min_capacity       = var.agent_runtime_min_capacity
  agent_runtime_max_capacity       = var.agent_runtime_max_capacity
  
  llm_integration_cpu              = var.llm_integration_cpu
  llm_integration_memory           = var.llm_integration_memory
  llm_integration_desired_count    = var.llm_integration_desired_count
  llm_integration_min_capacity     = var.llm_integration_min_capacity
  llm_integration_max_capacity     = var.llm_integration_max_capacity
}

# Monitoring Module
module "monitoring" {
  source = "../../modules/monitoring"

  project_name                    = var.project_name
  environment                     = var.environment
  aws_region                      = var.aws_region
  kms_key_id                      = module.security.kms_key_id
  ecs_cluster_name                = module.compute.ecs_cluster_name
  world_management_service_name   = module.compute.world_management_service_name
  agent_runtime_service_name      = module.compute.agent_runtime_service_name
  llm_integration_service_name    = module.compute.llm_integration_service_name
  alb_arn_suffix                  = split("/", module.compute.alb_arn)[1]
  worlds_table_name               = module.storage.worlds_table_name
  agents_table_name               = module.storage.agents_table_name
  memory_streams_table_name       = module.storage.memory_streams_table_name
  redis_cluster_id                = split(".", module.storage.redis_endpoint)[0]
}

# API Gateway Module
module "api_gateway" {
  source = "../../modules/api_gateway"

  project_name                        = var.project_name
  environment                         = var.environment
  alb_dns_name                        = module.compute.alb_dns_name
  api_gateway_logs_role_arn           = module.security.api_gateway_logs_role_arn
  api_gateway_access_log_group_arn    = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:${module.monitoring.api_gateway_access_log_group_name}"
}

# CloudFront Module
module "cloudfront" {
  source = "../../modules/cloudfront"

  project_name                        = var.project_name
  environment                         = var.environment
  static_assets_bucket_name           = module.storage.static_assets_bucket_name
  static_assets_bucket_domain_name    = module.storage.static_assets_bucket_domain_name
  cloudfront_oac_id                   = module.storage.cloudfront_oac_id
  api_gateway_domain_name             = split("//", module.api_gateway.rest_api_invoke_url)[1]
  domain_aliases                      = var.domain_aliases
  acm_certificate_arn                 = var.acm_certificate_arn
  price_class                         = var.cloudfront_price_class
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}