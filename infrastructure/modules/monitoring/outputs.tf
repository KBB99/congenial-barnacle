output "cloudwatch_dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "api_gateway_access_log_group_name" {
  description = "Name of the API Gateway access log group"
  value       = aws_cloudwatch_log_group.api_gateway_access.name
}

output "api_gateway_execution_log_group_name" {
  description = "Name of the API Gateway execution log group"
  value       = aws_cloudwatch_log_group.api_gateway_execution.name
}

output "xray_encryption_config_type" {
  description = "Type of X-Ray encryption configuration"
  value       = aws_xray_encryption_config.main.type
}