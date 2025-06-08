# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.project_name}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = false

  tags = {
    Name = "${var.project_name}-${var.environment}-alb"
  }
}

# Target Group for World Management Service
resource "aws_lb_target_group" "world_management" {
  name     = "${var.project_name}-${var.environment}-world-mgmt"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-world-mgmt-tg"
  }
}

# Target Group for Agent Runtime Service
resource "aws_lb_target_group" "agent_runtime" {
  name     = "${var.project_name}-${var.environment}-agent-runtime"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-agent-runtime-tg"
  }
}

# Target Group for LLM Integration Service
resource "aws_lb_target_group" "llm_integration" {
  name     = "${var.project_name}-${var.environment}-llm-integration"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-llm-integration-tg"
  }
}

# ALB Listener
resource "aws_lb_listener" "main" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.world_management.arn
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-alb-listener"
  }
}

# ALB Listener Rules
resource "aws_lb_listener_rule" "world_management" {
  listener_arn = aws_lb_listener.main.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.world_management.arn
  }

  condition {
    path_pattern {
      values = ["/api/worlds/*", "/api/snapshots/*"]
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-world-mgmt-rule"
  }
}

resource "aws_lb_listener_rule" "agent_runtime" {
  listener_arn = aws_lb_listener.main.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.agent_runtime.arn
  }

  condition {
    path_pattern {
      values = ["/api/agents/*", "/api/simulation/*", "/api/events/*"]
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-agent-runtime-rule"
  }
}

resource "aws_lb_listener_rule" "llm_integration" {
  listener_arn = aws_lb_listener.main.arn
  priority     = 300

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.llm_integration.arn
  }

  condition {
    path_pattern {
      values = ["/api/llm/*"]
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-llm-integration-rule"
  }
}