# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-${var.environment}-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-ecs-task-execution"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role
resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-${var.environment}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-ecs-task"
  }
}

# ECS Task Policy for DynamoDB Access
resource "aws_iam_policy" "ecs_dynamodb" {
  name        = "${var.project_name}-${var.environment}-ecs-dynamodb"
  description = "Policy for ECS tasks to access DynamoDB"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          var.worlds_table_arn,
          var.agents_table_arn,
          var.memory_streams_table_arn,
          var.world_objects_table_arn,
          var.events_table_arn,
          var.snapshots_table_arn,
          "${var.worlds_table_arn}/index/*",
          "${var.agents_table_arn}/index/*",
          "${var.memory_streams_table_arn}/index/*",
          "${var.world_objects_table_arn}/index/*",
          "${var.events_table_arn}/index/*",
          "${var.snapshots_table_arn}/index/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_dynamodb" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.ecs_dynamodb.arn
}

# ECS Task Policy for S3 Access
resource "aws_iam_policy" "ecs_s3" {
  name        = "${var.project_name}-${var.environment}-ecs-s3"
  description = "Policy for ECS tasks to access S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.world_assets_bucket_arn,
          "${var.world_assets_bucket_arn}/*",
          var.snapshots_bucket_arn,
          "${var.snapshots_bucket_arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_s3" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.ecs_s3.arn
}

# ECS Task Policy for Bedrock Access
resource "aws_iam_policy" "ecs_bedrock" {
  name        = "${var.project_name}-${var.environment}-ecs-bedrock"
  description = "Policy for ECS tasks to access Amazon Bedrock"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_bedrock" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.ecs_bedrock.arn
}

# ECS Task Policy for CloudWatch Logs
resource "aws_iam_policy" "ecs_logs" {
  name        = "${var.project_name}-${var.environment}-ecs-logs"
  description = "Policy for ECS tasks to write to CloudWatch Logs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_logs" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.ecs_logs.arn
}

# ECS Task Policy for X-Ray
resource "aws_iam_policy" "ecs_xray" {
  name        = "${var.project_name}-${var.environment}-ecs-xray"
  description = "Policy for ECS tasks to send traces to X-Ray"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_xray" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.ecs_xray.arn
}

# API Gateway CloudWatch Logs Role
resource "aws_iam_role" "api_gateway_logs" {
  name = "${var.project_name}-${var.environment}-api-gateway-logs"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-api-gateway-logs"
  }
}

resource "aws_iam_role_policy_attachment" "api_gateway_logs" {
  role       = aws_iam_role.api_gateway_logs.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

# CloudFront Distribution Update Role (for CI/CD)
resource "aws_iam_role" "cloudfront_update" {
  name = "${var.project_name}-${var.environment}-cloudfront-update"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-cloudfront-update"
  }
}

resource "aws_iam_policy" "cloudfront_update" {
  name        = "${var.project_name}-${var.environment}-cloudfront-update"
  description = "Policy for updating CloudFront distributions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
          "cloudfront:ListInvalidations"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "cloudfront_update" {
  role       = aws_iam_role.cloudfront_update.name
  policy_arn = aws_iam_policy.cloudfront_update.arn
}