output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "Point your domain's CNAME/A-alias here (or use this directly if you skipped Route53)."
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.backend.repository_url
  description = "docker push target — see README 'Deployment order'."
}

output "rds_endpoint" {
  value     = aws_db_instance.main.address
  sensitive = false # hostname only, not a secret
}

output "redis_endpoint" {
  value     = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive = false
}

output "secrets_manager_manual_secret_names" {
  value       = { for k, s in aws_secretsmanager_secret.manual : k => s.name }
  description = "Populate each of these via the AWS CLI before the ECS service can start healthy — see README 'Manual steps'."
}

output "cloudwatch_log_group_backend" {
  value = aws_cloudwatch_log_group.backend.name
}

output "guardduty_detector_id" {
  value = aws_guardduty_detector.main.id
}
