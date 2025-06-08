output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "world_management_service_name" {
  description = "Name of the world management ECS service"
  value       = aws_ecs_service.world_management.name
}

output "agent_runtime_service_name" {
  description = "Name of the agent runtime ECS service"
  value       = aws_ecs_service.agent_runtime.name
}

output "llm_integration_service_name" {
  description = "Name of the LLM integration ECS service"
  value       = aws_ecs_service.llm_integration.name
}

output "world_management_target_group_arn" {
  description = "ARN of the world management target group"
  value       = aws_lb_target_group.world_management.arn
}

output "agent_runtime_target_group_arn" {
  description = "ARN of the agent runtime target group"
  value       = aws_lb_target_group.agent_runtime.arn
}

output "llm_integration_target_group_arn" {
  description = "ARN of the LLM integration target group"
  value       = aws_lb_target_group.llm_integration.arn
}