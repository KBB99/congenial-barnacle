# Networking Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.networking.public_subnet_ids
}

output "private_app_subnet_ids" {
  description = "IDs of the private application subnets"
  value       = module.networking.private_app_subnet_ids
}

# Storage Outputs
output "worlds_table_name" {
  description = "Name of the Worlds DynamoDB table"
  value       = module.storage.worlds_table_name
}

output "agents_table_name" {
  description = "Name of the Agents DynamoDB table"
  value       = module.storage.agents_table_name
}

output "memory_streams_table_name" {
  description = "Name of the MemoryStreams DynamoDB table"
  value       = module.storage.memory_streams_table_name
}

output "world_objects_table_name" {
  description = "Name of the WorldObjects DynamoDB table"
  value       = module.storage.world_objects_table_name
}

output "events_table_name" {
  description = "Name of the Events DynamoDB table"
  value       = module.storage.events_table_name
}

output "snapshots_table_name" {
  description = "Name of the Snapshots DynamoDB table"
  value       = module.storage.snapshots_table_name
}

output "world_assets_bucket_name" {
  description = "Name of the world assets S3 bucket"
  value       = module.storage.world_assets_bucket_name
}

output "snapshots_bucket_name" {
  description = "Name of the snapshots S3 bucket"
  value       = module.storage.snapshots_bucket_name
}

output "static_assets_bucket_name" {
  description = "Name of the static assets S3 bucket"
  value       = module.storage.static_assets_bucket_name
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.storage.redis_endpoint
}

# Security Outputs
output "kms_key_id" {
  description = "ID of the KMS key"
  value       = module.security.kms_key_id
}

output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = module.security.ecs_task_execution_role_arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = module.security.ecs_task_role_arn
}

# Compute Outputs
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.compute.ecs_cluster_name
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.compute.alb_dns_name
}

# API Gateway Outputs
output "rest_api_invoke_url" {
  description = "Invoke URL of the REST API Gateway"
  value       = module.api_gateway.rest_api_invoke_url
}

output "websocket_stage_invoke_url" {
  description = "WebSocket stage invoke URL"
  value       = module.api_gateway.websocket_stage_invoke_url
}

# CloudFront Outputs
output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = module.cloudfront.cloudfront_domain_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = module.cloudfront.cloudfront_distribution_id
}

# Monitoring Outputs
output "cloudwatch_dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = module.monitoring.cloudwatch_dashboard_url
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = module.monitoring.sns_topic_arn
}

# Application URLs
output "application_url" {
  description = "Main application URL"
  value       = "https://${module.cloudfront.cloudfront_domain_name}"
}

output "api_base_url" {
  description = "API base URL"
  value       = module.api_gateway.rest_api_invoke_url
}

output "websocket_url" {
  description = "WebSocket URL"
  value       = module.api_gateway.websocket_stage_invoke_url
}