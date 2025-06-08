# ECS Service for World Management
resource "aws_ecs_service" "world_management" {
  name            = "${var.project_name}-${var.environment}-world-management"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.world_management.arn
  desired_count   = var.world_management_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [var.ecs_security_group_id]
    subnets          = var.private_subnet_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.world_management.arn
    container_name   = "world-management"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.main]

  tags = {
    Name = "${var.project_name}-${var.environment}-world-management-service"
  }
}

# ECS Service for Agent Runtime
resource "aws_ecs_service" "agent_runtime" {
  name            = "${var.project_name}-${var.environment}-agent-runtime"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.agent_runtime.arn
  desired_count   = var.agent_runtime_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [var.ecs_security_group_id]
    subnets          = var.private_subnet_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.agent_runtime.arn
    container_name   = "agent-runtime"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.main]

  tags = {
    Name = "${var.project_name}-${var.environment}-agent-runtime-service"
  }
}

# ECS Service for LLM Integration
resource "aws_ecs_service" "llm_integration" {
  name            = "${var.project_name}-${var.environment}-llm-integration"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.llm_integration.arn
  desired_count   = var.llm_integration_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [var.ecs_security_group_id]
    subnets          = var.private_subnet_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.llm_integration.arn
    container_name   = "llm-integration"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.main]

  tags = {
    Name = "${var.project_name}-${var.environment}-llm-integration-service"
  }
}

# Auto Scaling Target for World Management Service
resource "aws_appautoscaling_target" "world_management" {
  max_capacity       = var.world_management_max_capacity
  min_capacity       = var.world_management_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.world_management.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  tags = {
    Name = "${var.project_name}-${var.environment}-world-management-scaling-target"
  }
}

# Auto Scaling Policy for World Management Service - CPU
resource "aws_appautoscaling_policy" "world_management_cpu" {
  name               = "${var.project_name}-${var.environment}-world-management-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.world_management.resource_id
  scalable_dimension = aws_appautoscaling_target.world_management.scalable_dimension
  service_namespace  = aws_appautoscaling_target.world_management.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# Auto Scaling Policy for World Management Service - Memory
resource "aws_appautoscaling_policy" "world_management_memory" {
  name               = "${var.project_name}-${var.environment}-world-management-memory"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.world_management.resource_id
  scalable_dimension = aws_appautoscaling_target.world_management.scalable_dimension
  service_namespace  = aws_appautoscaling_target.world_management.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value = 80.0
  }
}

# Auto Scaling Target for Agent Runtime Service
resource "aws_appautoscaling_target" "agent_runtime" {
  max_capacity       = var.agent_runtime_max_capacity
  min_capacity       = var.agent_runtime_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.agent_runtime.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  tags = {
    Name = "${var.project_name}-${var.environment}-agent-runtime-scaling-target"
  }
}

# Auto Scaling Policy for Agent Runtime Service - CPU
resource "aws_appautoscaling_policy" "agent_runtime_cpu" {
  name               = "${var.project_name}-${var.environment}-agent-runtime-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.agent_runtime.resource_id
  scalable_dimension = aws_appautoscaling_target.agent_runtime.scalable_dimension
  service_namespace  = aws_appautoscaling_target.agent_runtime.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# Auto Scaling Policy for Agent Runtime Service - Memory
resource "aws_appautoscaling_policy" "agent_runtime_memory" {
  name               = "${var.project_name}-${var.environment}-agent-runtime-memory"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.agent_runtime.resource_id
  scalable_dimension = aws_appautoscaling_target.agent_runtime.scalable_dimension
  service_namespace  = aws_appautoscaling_target.agent_runtime.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value = 80.0
  }
}

# Auto Scaling Target for LLM Integration Service
resource "aws_appautoscaling_target" "llm_integration" {
  max_capacity       = var.llm_integration_max_capacity
  min_capacity       = var.llm_integration_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.llm_integration.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  tags = {
    Name = "${var.project_name}-${var.environment}-llm-integration-scaling-target"
  }
}

# Auto Scaling Policy for LLM Integration Service - CPU
resource "aws_appautoscaling_policy" "llm_integration_cpu" {
  name               = "${var.project_name}-${var.environment}-llm-integration-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.llm_integration.resource_id
  scalable_dimension = aws_appautoscaling_target.llm_integration.scalable_dimension
  service_namespace  = aws_appautoscaling_target.llm_integration.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# Auto Scaling Policy for LLM Integration Service - Memory
resource "aws_appautoscaling_policy" "llm_integration_memory" {
  name               = "${var.project_name}-${var.environment}-llm-integration-memory"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.llm_integration.resource_id
  scalable_dimension = aws_appautoscaling_target.llm_integration.scalable_dimension
  service_namespace  = aws_appautoscaling_target.llm_integration.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value = 80.0
  }
}