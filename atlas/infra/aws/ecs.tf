resource "aws_ecs_cluster" "main" {
  name = "${var.project}-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/${var.project}/${var.environment}/backend"
  retention_in_days = var.log_retention_days
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project}-${var.environment}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${aws_ecr_repository.backend.repository_url}:${var.backend_image_tag}"
      essential = true

      portMappings = [{
        containerPort = var.backend_container_port
        protocol      = "tcp"
      }]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = tostring(var.backend_container_port) },
        { name = "REDIS_HOST", value = aws_elasticache_replication_group.main.primary_endpoint_address },
        { name = "REDIS_PORT", value = "6379" },
        { name = "REDIS_TLS", value = tostring(var.redis_tls) },

        # Production/default app: seller OAuth, token exchange/refresh,
        # and connected-seller API calls.
        { name = "AMAZON_SP_API_ENVIRONMENT", value = "production" },
        { name = "AMAZON_SP_API_APPLICATION_ID", value = var.amazon_sp_api_application_id },
        { name = "AMAZON_SP_API_REDIRECT_URI", value = var.amazon_sp_api_redirect_uri },
        { name = "AMAZON_SP_API_AUTH_VERSION_BETA", value = tostring(var.amazon_sp_api_auth_version_beta) },

        # Sandbox app: sandbox-health and staging discovery use this.
        { name = "AMAZON_SP_API_SANDBOX_CLIENT_ID", value = var.amazon_sp_api_sandbox_client_id },

        { name = "CORS_ORIGINS", value = var.cors_origins },
      ]

      secrets = [
        { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.database_url.arn },
        { name = "REDIS_PASSWORD", valueFrom = aws_secretsmanager_secret.redis_auth_token.arn },
        { name = "JWT_SECRET", valueFrom = aws_secretsmanager_secret.manual["jwt-access-secret"].arn },
        { name = "JWT_REFRESH_SECRET", valueFrom = aws_secretsmanager_secret.manual["jwt-refresh-secret"].arn },
        { name = "ATLAS_CREDENTIAL_KEY", valueFrom = aws_secretsmanager_secret.manual["atlas-credential-key"].arn },

        # Production Amazon LWA credentials.
        { name = "AMAZON_SP_API_CLIENT_ID", valueFrom = data.aws_secretsmanager_secret.amazon_production["amazon-sp-api-production-client-id"].arn },
        { name = "AMAZON_SP_API_CLIENT_SECRET", valueFrom = data.aws_secretsmanager_secret.amazon_production["amazon-sp-api-production-client-secret"].arn },

        # Sandbox Amazon LWA credentials.
        { name = "AMAZON_SP_API_SANDBOX_CLIENT_SECRET", valueFrom = aws_secretsmanager_secret.manual["amazon-sp-api-client-secret"].arn },
        { name = "AMAZON_SP_API_SANDBOX_REFRESH_TOKEN", valueFrom = aws_secretsmanager_secret.manual["amazon-sp-api-sandbox-refresh-token"].arn },
      ]

      logConfiguration = {
        logDriver = "awslogs"

        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "backend" {
  name            = "${var.project}-${var.environment}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.backend_desired_count
  launch_type     = "FARGATE"

  # The ATLAS backend currently takes around 1.5-2 minutes to complete
  # startup. Give the new task enough time to become ready before the
  # ALB health check can cause ECS to stop it.
  health_check_grace_period_seconds = 180

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = var.backend_container_port
  }

  depends_on = [aws_lb_listener.https]
}