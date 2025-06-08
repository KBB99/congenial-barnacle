variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "worlds_table_arn" {
  description = "ARN of the Worlds DynamoDB table"
  type        = string
}

variable "agents_table_arn" {
  description = "ARN of the Agents DynamoDB table"
  type        = string
}

variable "memory_streams_table_arn" {
  description = "ARN of the MemoryStreams DynamoDB table"
  type        = string
}

variable "world_objects_table_arn" {
  description = "ARN of the WorldObjects DynamoDB table"
  type        = string
}

variable "events_table_arn" {
  description = "ARN of the Events DynamoDB table"
  type        = string
}

variable "snapshots_table_arn" {
  description = "ARN of the Snapshots DynamoDB table"
  type        = string
}

variable "world_assets_bucket_arn" {
  description = "ARN of the world assets S3 bucket"
  type        = string
}

variable "snapshots_bucket_arn" {
  description = "ARN of the snapshots S3 bucket"
  type        = string
}