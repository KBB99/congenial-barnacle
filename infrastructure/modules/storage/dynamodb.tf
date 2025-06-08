# Worlds Table
resource "aws_dynamodb_table" "worlds" {
  name           = "${var.project_name}-${var.environment}-worlds"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "worldId"

  attribute {
    name = "worldId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name     = "StatusIndex"
    hash_key = "status"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_id  = var.kms_key_id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-worlds"
  }
}

# Agents Table
resource "aws_dynamodb_table" "agents" {
  name           = "${var.project_name}-${var.environment}-agents"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "agentId"

  attribute {
    name = "agentId"
    type = "S"
  }

  attribute {
    name = "worldId"
    type = "S"
  }

  global_secondary_index {
    name     = "WorldIdIndex"
    hash_key = "worldId"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_id  = var.kms_key_id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-agents"
  }
}

# MemoryStreams Table
resource "aws_dynamodb_table" "memory_streams" {
  name           = "${var.project_name}-${var.environment}-memory-streams"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "memoryId"

  attribute {
    name = "memoryId"
    type = "S"
  }

  attribute {
    name = "agentId"
    type = "S"
  }

  attribute {
    name = "type"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  global_secondary_index {
    name     = "AgentIdIndex"
    hash_key = "agentId"
    range_key = "timestamp"
  }

  global_secondary_index {
    name     = "TypeIndex"
    hash_key = "type"
    range_key = "timestamp"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_id  = var.kms_key_id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-memory-streams"
  }
}

# WorldObjects Table
resource "aws_dynamodb_table" "world_objects" {
  name           = "${var.project_name}-${var.environment}-world-objects"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "objectId"

  attribute {
    name = "objectId"
    type = "S"
  }

  attribute {
    name = "worldId"
    type = "S"
  }

  global_secondary_index {
    name     = "WorldIdIndex"
    hash_key = "worldId"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_id  = var.kms_key_id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-world-objects"
  }
}

# Events Table
resource "aws_dynamodb_table" "events" {
  name           = "${var.project_name}-${var.environment}-events"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "eventId"

  attribute {
    name = "eventId"
    type = "S"
  }

  attribute {
    name = "worldId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  global_secondary_index {
    name     = "WorldIdTimestampIndex"
    hash_key = "worldId"
    range_key = "timestamp"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_id  = var.kms_key_id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-events"
  }
}

# Snapshots Table
resource "aws_dynamodb_table" "snapshots" {
  name           = "${var.project_name}-${var.environment}-snapshots"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "snapshotId"

  attribute {
    name = "snapshotId"
    type = "S"
  }

  attribute {
    name = "worldId"
    type = "S"
  }

  global_secondary_index {
    name     = "WorldIdIndex"
    hash_key = "worldId"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_id  = var.kms_key_id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-snapshots"
  }
}