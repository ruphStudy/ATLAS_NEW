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

output "frontend_amplify_app_id" {
  value = aws_amplify_app.frontend.id
}

output "frontend_amplify_default_domain" {
  value       = "https://${aws_amplify_branch.frontend.branch_name}.${aws_amplify_app.frontend.default_domain}"
  description = "Amplify-provided URL for the branch — usable before the custom domain finishes verifying."
}

output "frontend_url" {
  value       = local.frontend_origin
  description = "Public staging frontend origin. Amazon SP-API Login URI = <frontend_url>/amazon/oauth/login."
}

output "frontend_amazon_login_uri" {
  value = "${local.frontend_origin}/amazon/oauth/login"
}

output "frontend_route53_zone_id" {
  value = data.aws_route53_zone.frontend.zone_id
}
