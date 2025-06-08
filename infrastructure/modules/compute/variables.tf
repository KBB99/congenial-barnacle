variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "ALB security group ID"
  type        = string
}

variable "ecs_security_group_id" {
  description = "ECS security group ID"
  type        = string
}

variable "kms_key_id" {
  description = "KMS key ID for encryption"
  type        = string
}

variable "ecs_task_execution_role_arn" {
  description = "ECS task execution role ARN"
  type        = string
}

variable "ecs_task_role_arn" {
  description = "ECS task role ARN"
  type        = string
}

# DynamoDB table names
variable "worlds_table_name" {
  description = "Name of the Worlds DynamoDB table"
  type        = string
}

variable "agents_table_name" {
  description = "Name of the Agents DynamoDB table"
  type        = string
}

variable "memory_streams_table_name" {
  description = "Name of the MemoryStreams DynamoDB table"
  type        = string
}

variable "world_objects_table_name" {
  description = "Name of the WorldObjects DynamoDB table"
  type        = string
}

variable "events_table_name" {
  description = "Name of the Events DynamoDB table"
  type        = string
}

variable "snapshots_table_name" {
  description = "Name of the Snapshots DynamoDB table"
  type        = string
}

# S3 bucket names
variable "world_assets_bucket_name" {
  description = "Name of the world assets S3 bucket"
  type        = string
}

variable "snapshots_bucket_name" {
  description = "Name of the snapshots S3 bucket"
  type        = string
}

# Redis configuration
variable "redis_endpoint" {
  description = "Redis cluster endpoint"
  type        = string
}

variable "redis_auth_token_secret_arn" {
  description = "ARN of the Redis auth token secret in Secrets Manager"
  type        = string
}

# Container images
variable "world_management_image" {
  description = "Docker image for world management service"
  type        = string
  default     = "generative-world/world-management"
}

variable "agent_runtime_image" {
  description = "Docker image for agent runtime service"
  type        = string
  default     = "generative-world/agent-runtime"
}

variable "llm_integration_image" {
  description = "Docker image for LLM integration service"
  type        = string
  default     = "generative-world/llm-integration"
}

variable "image_tag" {
  description = "Docker image tag"
  type        = string
  default     = "latest"
}

# World Management Service configuration
variable "world_management_cpu" {
  description = "CPU units for world management service"
  type        = number
  default     = 512
}

variable "world_management_memory" {
  description = "Memory for world management service"
  type        = number
  default     = 1024
}

variable "world_management_desired_count" {
  description = "Desired count for world management service"
  type        = number
  default     = 2
}

variable "world_management_min_capacity" {
  description = "Minimum capacity for world management service"
  type        = number
  default     = 1
}

variable "world_management_max_capacity" {
  description = "Maximum capacity for world management service"
  type        = number
  default     = 10
}

# Agent Runtime Service configuration
variable "agent_runtime_cpu" {
  description = "CPU units for agent runtime service"
  type        = number
  default     = 1024
}

variable "agent_runtime_memory" {
  description = "Memory for agent runtime service"
  type        = number
  default     = 2048
}

variable "agent_runtime_desired_count" {
  description = "Desired count for agent runtime service"
  type        = number
  default     = 2
}

variable "agent_runtime_min_capacity" {
  description = "Minimum capacity for agent runtime service"
  type        = number
  default     = 1
}

variable "agent_runtime_max_capacity" {
  description = "Maximum capacity for agent runtime service"
  type        = number
  default     = 20
}

# LLM Integration Service configuration
variable "llm_integration_cpu" {
  description = "CPU units for LLM integration service"
  type        = number
  default     = 512
}

variable "llm_integration_memory" {
  description = "Memory for LLM integration service"
  type        = number
  default     = 1024
}

variable "llm_integration_desired_count" {
  description = "Desired count for LLM integration service"
  type        = number
  default     = 2
}

variable "llm_integration_min_capacity" {
  description = "Minimum capacity for LLM integration service"
  type        = number
  default     = 1
}

variable "llm_integration_max_capacity" {
  description = "Maximum capacity for LLM integration service"
  type        = number
  default     = 10
}