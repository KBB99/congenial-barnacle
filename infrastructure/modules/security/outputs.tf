output "kms_key_id" {
  description = "ID of the KMS key"
  value       = aws_kms_key.main.key_id
}

output "kms_key_arn" {
  description = "ARN of the KMS key"
  value       = aws_kms_key.main.arn
}

output "kms_alias_name" {
  description = "Name of the KMS key alias"
  value       = aws_kms_alias.main.name
}

output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task.arn
}

output "api_gateway_logs_role_arn" {
  description = "ARN of the API Gateway CloudWatch logs role"
  value       = aws_iam_role.api_gateway_logs.arn
}

output "cloudfront_update_role_arn" {
  description = "ARN of the CloudFront update role"
  value       = aws_iam_role.cloudfront_update.arn
}