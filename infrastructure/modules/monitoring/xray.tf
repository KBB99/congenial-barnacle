# X-Ray Encryption Configuration
resource "aws_xray_encryption_config" "main" {
  type   = "KMS"
  key_id = var.kms_key_id
}

# X-Ray Sampling Rule for API Gateway
resource "aws_xray_sampling_rule" "api_gateway" {
  rule_name      = "${var.project_name}-${var.environment}-api-gateway"
  priority       = 9000
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.1
  url_path       = "/api/*"
  host           = "*"
  http_method    = "*"
  service_type   = "AWS::ApiGateway::Stage"
  service_name   = "*"
  resource_arn   = "*"

  tags = {
    Name = "${var.project_name}-${var.environment}-api-gateway-sampling"
  }
}

# X-Ray Sampling Rule for ECS Services
resource "aws_xray_sampling_rule" "ecs_services" {
  rule_name      = "${var.project_name}-${var.environment}-ecs-services"
  priority       = 9001
  version        = 1
  reservoir_size = 2
  fixed_rate     = 0.2
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "AWS::ECS::Container"
  service_name   = "*"
  resource_arn   = "*"

  tags = {
    Name = "${var.project_name}-${var.environment}-ecs-services-sampling"
  }
}

# X-Ray Sampling Rule for DynamoDB
resource "aws_xray_sampling_rule" "dynamodb" {
  rule_name      = "${var.project_name}-${var.environment}-dynamodb"
  priority       = 9002
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.05
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "AWS::DynamoDB::Table"
  service_name   = "*"
  resource_arn   = "*"

  tags = {
    Name = "${var.project_name}-${var.environment}-dynamodb-sampling"
  }
}

# X-Ray Sampling Rule for Bedrock
resource "aws_xray_sampling_rule" "bedrock" {
  rule_name      = "${var.project_name}-${var.environment}-bedrock"
  priority       = 9003
  version        = 1
  reservoir_size = 2
  fixed_rate     = 0.3
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "AWS::Bedrock::*"
  service_name   = "*"
  resource_arn   = "*"

  tags = {
    Name = "${var.project_name}-${var.environment}-bedrock-sampling"
  }
}