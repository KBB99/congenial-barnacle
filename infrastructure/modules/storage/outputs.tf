# DynamoDB Table Outputs
output "worlds_table_name" {
  description = "Name of the Worlds DynamoDB table"
  value       = aws_dynamodb_table.worlds.name
}

output "worlds_table_arn" {
  description = "ARN of the Worlds DynamoDB table"
  value       = aws_dynamodb_table.worlds.arn
}

output "agents_table_name" {
  description = "Name of the Agents DynamoDB table"
  value       = aws_dynamodb_table.agents.name
}

output "agents_table_arn" {
  description = "ARN of the Agents DynamoDB table"
  value       = aws_dynamodb_table.agents.arn
}

output "memory_streams_table_name" {
  description = "Name of the MemoryStreams DynamoDB table"
  value       = aws_dynamodb_table.memory_streams.name
}

output "memory_streams_table_arn" {
  description = "ARN of the MemoryStreams DynamoDB table"
  value       = aws_dynamodb_table.memory_streams.arn
}

output "world_objects_table_name" {
  description = "Name of the WorldObjects DynamoDB table"
  value       = aws_dynamodb_table.world_objects.name
}

output "world_objects_table_arn" {
  description = "ARN of the WorldObjects DynamoDB table"
  value       = aws_dynamodb_table.world_objects.arn
}

output "events_table_name" {
  description = "Name of the Events DynamoDB table"
  value       = aws_dynamodb_table.events.name
}

output "events_table_arn" {
  description = "ARN of the Events DynamoDB table"
  value       = aws_dynamodb_table.events.arn
}

output "snapshots_table_name" {
  description = "Name of the Snapshots DynamoDB table"
  value       = aws_dynamodb_table.snapshots.name
}

output "snapshots_table_arn" {
  description = "ARN of the Snapshots DynamoDB table"
  value       = aws_dynamodb_table.snapshots.arn
}

# S3 Bucket Outputs
output "world_assets_bucket_name" {
  description = "Name of the world assets S3 bucket"
  value       = aws_s3_bucket.world_assets.bucket
}

output "world_assets_bucket_arn" {
  description = "ARN of the world assets S3 bucket"
  value       = aws_s3_bucket.world_assets.arn
}

output "snapshots_bucket_name" {
  description = "Name of the snapshots S3 bucket"
  value       = aws_s3_bucket.snapshots.bucket
}

output "snapshots_bucket_arn" {
  description = "ARN of the snapshots S3 bucket"
  value       = aws_s3_bucket.snapshots.arn
}

output "static_assets_bucket_name" {
  description = "Name of the static assets S3 bucket"
  value       = aws_s3_bucket.static_assets.bucket
}

output "static_assets_bucket_arn" {
  description = "ARN of the static assets S3 bucket"
  value       = aws_s3_bucket.static_assets.arn
}

output "static_assets_bucket_domain_name" {
  description = "Domain name of the static assets S3 bucket"
  value       = aws_s3_bucket.static_assets.bucket_domain_name
}

output "cloudfront_oac_id" {
  description = "CloudFront Origin Access Control ID"
  value       = aws_cloudfront_origin_access_control.static_assets.id
}

# ElastiCache Outputs
output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_replication_group.redis.configuration_endpoint_address
}

output "redis_port" {
  description = "Redis cluster port"
  value       = aws_elasticache_replication_group.redis.port
}

output "redis_auth_token" {
  description = "Redis auth token"
  value       = aws_elasticache_replication_group.redis.auth_token
  sensitive   = true
}