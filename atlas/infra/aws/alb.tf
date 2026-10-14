resource "aws_s3_bucket" "alb_logs" {
  bucket = "${var.project}-${var.environment}-alb-logs-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "alb_logs" {
  bucket                  = aws_s3_bucket.alb_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    id     = "expire-old-logs"
    status = "Enabled"

    filter {}

    expiration {
      days = 90
    }
  }
}

# ALB access-log delivery requires the regional ELB service account to write to the bucket.
data "aws_elb_service_account" "main" {}

resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = data.aws_elb_service_account.main.arn }
      Action    = "s3:PutObject"
      Resource  = "${aws_s3_bucket.alb_logs.arn}/alb/*"
    }]
  })
}

resource "aws_lb" "main" {
  name               = "${var.project}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    prefix  = "alb"
    enabled = true
  }

  tags = {
    Name = "${var.project}-${var.environment}-alb"
  }
}

# ── Backend target group ────────────────────────────────────────

resource "aws_lb_target_group" "backend" {
  name        = "${var.project}-${var.environment}-backend-tg"
  port        = var.backend_container_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip" # required for awsvpc-networked Fargate tasks

  health_check {
    path                = "/api/v1/health/live"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200"
  }

  tags = {
    Name = "${var.project}-${var.environment}-backend-tg"
  }
}

# ── Frontend target group ───────────────────────────────────────

resource "aws_lb_target_group" "frontend" {
  name        = "${var.project}-${var.environment}-frontend-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200-399"
  }

  tags = {
    Name = "${var.project}-${var.environment}-frontend-tg"
  }
}

# ── HTTPS listener ──────────────────────────────────────────────

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06" # TLS 1.2 minimum, TLS 1.3 preferred
  certificate_arn   = local.acm_certificate_arn

  # Keep the existing backend target group as the listener default.
  # The frontend hostname is routed separately by the listener rule below.
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

# Route the staging frontend hostname to the frontend ECS target group.
resource "aws_lb_listener_rule" "frontend_host" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }

  condition {
    host_header {
      values = ["staging.codeexpoglobal.com"]
    }
  }
}

# ── HTTP → HTTPS redirect ───────────────────────────────────────

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}