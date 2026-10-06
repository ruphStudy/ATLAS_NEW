# Redis isolation: private subnets only, SG accepts only ECS tasks,
# encryption in-transit + at-rest, AUTH token required. Single node (no
# cluster/replica) — matches the existing docker-compose single-instance
# BullMQ setup; this is a compliance/staging slice, not HA production.

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project}-${var.environment}-redis-subnets"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.project}-${var.environment}-redis"
  description          = "ATLAS ${var.environment} Redis (BullMQ)"

  engine             = "redis"
  engine_version     = "7.1"
  node_type          = var.redis_node_type
  num_cache_clusters = 1

  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result

  automatic_failover_enabled = false # single node — no failover target; matches num_cache_clusters = 1
  apply_immediately          = true

  tags = { Name = "${var.project}-${var.environment}-redis" }
}
