# ── Frontend DNS ────────────────────────────────────────────────
# staging.codeexpoglobal.com → existing Application Load Balancer

resource "aws_route53_record" "frontend_alb" {
  zone_id = data.aws_route53_zone.frontend.zone_id
  name    = "${var.frontend_subdomain}.${var.frontend_root_domain}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}