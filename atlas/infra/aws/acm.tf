# HTTPS/TLS certificate. Two supported paths:
#  1. You already have a cert (any registrar/ACM import) -> set var.acm_certificate_arn, this file creates nothing.
#  2. You own a Route53 public hosted zone for the domain -> set var.route53_zone_id + var.domain_name, Terraform requests + DNS-validates a free ACM cert.
# If neither is set, the ALB HTTPS listener has no certificate and `apply` will fail there — by design, HTTP-only is never a valid end state.

locals {
  create_acm_cert = var.acm_certificate_arn == "" && var.route53_zone_id != ""
}

resource "aws_acm_certificate" "main" {
  count             = local.create_acm_cert ? 1 : 0
  domain_name       = var.domain_name
  validation_method = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "acm_validation" {
  for_each = local.create_acm_cert ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "main" {
  count                   = local.create_acm_cert ? 1 : 0
  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for r in aws_route53_record.acm_validation : r.fqdn]
}

locals {
  acm_certificate_arn = local.create_acm_cert ? aws_acm_certificate.main[0].arn : var.acm_certificate_arn
}

# ── Frontend TLS certificate ────────────────────────────────────

resource "aws_acm_certificate" "frontend" {
  domain_name       = "${var.frontend_subdomain}.${var.frontend_root_domain}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "frontend_acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.frontend.domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = data.aws_route53_zone.frontend.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "frontend" {
  certificate_arn = aws_acm_certificate.frontend.arn

  validation_record_fqdns = [
    for record in aws_route53_record.frontend_acm_validation :
    record.fqdn
  ]
}