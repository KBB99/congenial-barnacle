variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "generative-world"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in the Redis cluster"
  type        = number
  default     = 1
}

# World Management Service Configuration
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
  default     = 1
}

variable "world_management_min_capacity" {
  description = "Minimum capacity for world management service"
  type        = number
  default     = 1
}

variable "world_management_max_capacity" {
  description = "Maximum capacity for world management service"
  type        = number
  default     = 5
}

# Agent Runtime Service Configuration
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
  default     = 1
}

variable "agent_runtime_min_capacity" {
  description = "Minimum capacity for agent runtime service"
  type        = number
  default     = 1
}

variable "agent_runtime_max_capacity" {
  description = "Maximum capacity for agent runtime service"
  type        = number
  default     = 10
}

# LLM Integration Service Configuration
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
  default     = 1
}

variable "llm_integration_min_capacity" {
  description = "Minimum capacity for LLM integration service"
  type        = number
  default     = 1
}

variable "llm_integration_max_capacity" {
  description = "Maximum capacity for LLM integration service"
  type        = number
  default     = 5
}

# CloudFront Configuration
variable "domain_aliases" {
  description = "List of domain aliases for CloudFront"
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS"
  type        = string
  default     = null
}

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}