variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  type        = string
}

variable "api_gateway_logs_role_arn" {
  description = "ARN of the API Gateway CloudWatch logs role"
  type        = string
}

variable "api_gateway_access_log_group_arn" {
  description = "ARN of the API Gateway access log group"
  type        = string
}