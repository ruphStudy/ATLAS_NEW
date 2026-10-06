# Private database access: no public IP, subnet group is private-only,
# security group accepts only the ECS tasks (security_groups.tf). Storage
# is encrypted with the AWS-managed `aws/rds` key (no extra KMS cost).
#
# Master password is Terraform-generated (random_password, never a
# hardcoded literal) and stored ONLY in Secrets Manager as part of the
# composed DATABASE_URL (see secrets.tf) — deliberately not using RDS's
# native `manage_master_user_password` here, because that feature keeps
# the password value opaque to Terraform, making it impossible to compose
# the single `DATABASE_URL` connection string ATLAS's existing
# ConfigurationService already expects (avoids a backend code change).

resource "random_password" "db_password" {
  length  = 32
  special = false # keeps the value URL-safe for embedding directly in DATABASE_URL
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-${var.environment}-db-subnets"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "${var.project}-${var.environment}-db-subnets" }
}

resource "aws_db_instance" "main" {
  identifier     = "${var.project}-${var.environment}-db"
  engine         = "postgres"
  engine_version = "17"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage_gb
  max_allocated_storage = var.db_allocated_storage_gb * 3 # allows autoscaling up to 3x before a manual resize is needed
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false # single-AZ keeps this a "small slice", not full production HA — flip to true later without downtime

  backup_retention_period   = 7
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project}-${var.environment}-db-final"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = { Name = "${var.project}-${var.environment}-db" }
}
