# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}"

  configuration {
    execute_command_configuration {
      kms_key_id = var.kms_key_id
      logging    = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs_exec.name
      }
    }
  }

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-cluster"
  }
}

# CloudWatch Log Group for ECS Exec
resource "aws_cloudwatch_log_group" "ecs_exec" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}/exec"
  retention_in_days = 7
  kms_key_id        = var.kms_key_id

  tags = {
    Name = "${var.project_name}-${var.environment}-ecs-exec"
  }
}

# CloudWatch Log Group for World Management Service
resource "aws_cloudwatch_log_group" "world_management" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}/world-management"
  retention_in_days = 14
  kms_key_id        = var.kms_key_id

  tags = {
    Name = "${var.project_name}-${var.environment}-world-management"
  }
}

# CloudWatch Log Group for Agent Runtime Service
resource "aws_cloudwatch_log_group" "agent_runtime" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}/agent-runtime"
  retention_in_days = 14
  kms_key_id        = var.kms_key_id

  tags = {
    Name = "${var.project_name}-${var.environment}-agent-runtime"
  }
}

# CloudWatch Log Group for LLM Integration Service
resource "aws_cloudwatch_log_group" "llm_integration" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}/llm-integration"
  retention_in_days = 14
  kms_key_id        = var.kms_key_id

  tags = {
    Name = "${var.project_name}-${var.environment}-llm-integration"
  }
}

# ECS Task Definition for World Management Service
resource "aws_ecs_task_definition" "world_management" {
  family                   = "${var.project_name}-${var.environment}-world-management"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.world_management_cpu
  memory                   = var.world_management_memory
  execution_role_arn       = var.ecs_task_execution_role_arn
  task_role_arn           = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "world-management"
      image = "${var.world_management_image}:${var.image_tag}"
      
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "WORLDS_TABLE"
          value = var.worlds_table_name
        },
        {
          name  = "AGENTS_TABLE"
          value = var.agents_table_name
        },
        {
          name  = "SNAPSHOTS_TABLE"
          value = var.snapshots_table_name
        },
        {
          name  = "WORLD_ASSETS_BUCKET"
          value = var.world_assets_bucket_name
        },
        {
          name  = "SNAPSHOTS_BUCKET"
          value = var.snapshots_bucket_name
        },
        {
          name  = "REDIS_ENDPOINT"
          value = var.redis_endpoint
        }
      ]

      secrets = [
        {
          name      = "REDIS_AUTH_TOKEN"
          valueFrom = var.redis_auth_token_secret_arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.world_management.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-${var.environment}-world-management"
  }
}

# ECS Task Definition for Agent Runtime Service
resource "aws_ecs_task_definition" "agent_runtime" {
  family                   = "${var.project_name}-${var.environment}-agent-runtime"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.agent_runtime_cpu
  memory                   = var.agent_runtime_memory
  execution_role_arn       = var.ecs_task_execution_role_arn
  task_role_arn           = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "agent-runtime"
      image = "${var.agent_runtime_image}:${var.image_tag}"
      
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "AGENTS_TABLE"
          value = var.agents_table_name
        },
        {
          name  = "MEMORY_STREAMS_TABLE"
          value = var.memory_streams_table_name
        },
        {
          name  = "WORLD_OBJECTS_TABLE"
          value = var.world_objects_table_name
        },
        {
          name  = "EVENTS_TABLE"
          value = var.events_table_name
        },
        {
          name  = "REDIS_ENDPOINT"
          value = var.redis_endpoint
        }
      ]

      secrets = [
        {
          name      = "REDIS_AUTH_TOKEN"
          valueFrom = var.redis_auth_token_secret_arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.agent_runtime.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-${var.environment}-agent-runtime"
  }
}

# ECS Task Definition for LLM Integration Service
resource "aws_ecs_task_definition" "llm_integration" {
  family                   = "${var.project_name}-${var.environment}-llm-integration"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.llm_integration_cpu
  memory                   = var.llm_integration_memory
  execution_role_arn       = var.ecs_task_execution_role_arn
  task_role_arn           = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "llm-integration"
      image = "${var.llm_integration_image}:${var.image_tag}"
      
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "REDIS_ENDPOINT"
          value = var.redis_endpoint
        }
      ]

      secrets = [
        {
          name      = "REDIS_AUTH_TOKEN"
          valueFrom = var.redis_auth_token_secret_arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.llm_integration.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-${var.environment}-llm-integration"
  }
}