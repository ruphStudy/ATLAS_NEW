# Secure secret storage: Terraform creates the secret SHELLS only — no
# value ever passes through a .tf file, .tfvars, or Terraform state. You
# populate each value once, manually, via the AWS CLI/Console after
# `terraform apply` (see README "Manual steps"). ECS reads values directly
# from Secrets Manager at task-start via the `secrets` block in ecs.tf —
# the plaintext is never baked into the image or task definition.
#
# Encrypted with the AWS-managed key `aws/secretsmanager` (no extra KMS
# cost) — sufficient for compliance evidence; swap in a customer-managed
# CMK later only if a specific control requires it.

locals {
  # The RDS master password is handled separately (random_password.db_password
  # in rds.tf, composed into the database-url secret below) — Terraform
  # generates it, nothing here is a hand-typed literal.
  manual_secret_names = [
    "jwt-access-secret",
    "jwt-refresh-secret",
    "atlas-credential-key", # ATLAS_CREDENTIAL_KEY — encrypts Amazon SP-API refresh tokens etc. at rest in Postgres
    "amazon-sp-api-client-secret",
    "amazon-sp-api-sandbox-refresh-token",
  ]
}

resource "aws_secretsmanager_secret" "manual" {
  for_each                = toset(local.manual_secret_names)
  name                    = "${var.project}/${var.environment}/${each.value}"
  description             = "ATLAS ${var.environment} — populate manually, see README 'Manual steps'"
  recovery_window_in_days = 7
}

# Redis auth token: infrastructure-generated (not a business/Amazon secret),
# so Terraform is allowed to create and store it directly — no manual step.
resource "random_password" "redis_auth_token" {
  length  = 32
  special = false # ElastiCache AUTH tokens must be alphanumeric-only per AWS's own restriction
}

resource "aws_secretsmanager_secret" "redis_auth_token" {
  name                    = "${var.project}/${var.environment}/redis-auth-token"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "redis_auth_token" {
  secret_id     = aws_secretsmanager_secret.redis_auth_token.id
  secret_string = random_password.redis_auth_token.result
}

# Composed DATABASE_URL: the only place the RDS master password's plaintext
# is ever assembled — directly into Secrets Manager, never into a `.tfvars`
# file or a plain Terraform output.
resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${var.project}/${var.environment}/database-url"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.main.address}:5432/${var.db_name}?schema=public&sslmode=require"
}

# Production Amazon SP-API app credentials. These two secrets were created
# (and populated) outside Terraform, so they are only LOOKED UP here — never
# created/managed — to avoid a name conflict with the existing secrets. The
# sandbox app keeps using the manual secrets above
# (amazon-sp-api-client-secret / amazon-sp-api-sandbox-refresh-token).
data "aws_secretsmanager_secret" "amazon_production" {
  for_each = toset([
    "amazon-sp-api-production-client-id",
    "amazon-sp-api-production-client-secret",
  ])
  name = "${var.project}/${var.environment}/${each.value}"
}
