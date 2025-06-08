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

variable "kms_key_id" {
  description = "KMS key ID for encryption"
  type        = string
}

variable "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
}

variable "world_management_service_name" {
  description = "Name of the world management ECS service"
  type        = string
}

variable "agent_runtime_service_name" {
  description = "Name of the agent runtime ECS service"
  type        = string
}

variable "llm_integration_service_name" {
  description = "Name of the LLM integration ECS service"
  type        = string
}

variable "alb_arn_suffix" {
  description = "ARN suffix of the Application Load Balancer"
  type        = string
}

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

variable "redis_cluster_id" {
  description = "ID of the Redis cluster"
  type        = string
}