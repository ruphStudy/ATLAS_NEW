variable "aws_region" {
  description = "AWS region — ap-south-1 (Mumbai) keeps latency low for an India-run team and has no price premium over us-east-1."
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment name (used in tags/resource names)."
  type        = string
  default     = "staging"
}

variable "project" {
  description = "Short project prefix for resource names."
  type        = string
  default     = "atlas"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.20.0.0/24", "10.20.1.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.20.10.0/24", "10.20.11.0/24"]
}

variable "single_nat_gateway" {
  description = "Use one NAT Gateway shared across both AZs instead of one per AZ — halves NAT cost; acceptable for a small compliance/staging slice, not full multi-AZ production."
  type        = bool
  default     = true
}

# ── Compute sizing (kept intentionally small) ──────────────────

variable "backend_image_tag" {
  description = "Tag of the backend image already pushed to the ECR repo this stack creates."
  type        = string
  default     = "spapi-fix-001"
}

variable "backend_container_port" {
  type    = number
  default = 3001
}

variable "backend_cpu" {
  description = "Fargate task vCPU units (256 = 0.25 vCPU — smallest Fargate size)."
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "Fargate task memory in MB (512 = smallest paired with 256 CPU)."
  type        = number
  default     = 512
}

variable "backend_desired_count" {
  type    = number
  default = 1
}

variable "frontend_image_tag" {
  description = "Tag of the frontend image already pushed to the frontend ECR repository."
  type        = string
  default     = "staging-001"
}

variable "frontend_container_port" {
  type    = number
  default = 3000
}

variable "frontend_cpu" {
  description = "Fargate task vCPU units for the frontend."
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Fargate task memory in MB for the frontend."
  type        = number
  default     = 512
}

variable "frontend_desired_count" {
  type    = number
  default = 1
}

# ── Database ────────────────────────────────────────────────────

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_allocated_storage_gb" {
  type    = number
  default = 20
}

variable "db_name" {
  type    = string
  default = "atlas_db"
}

variable "db_username" {
  type    = string
  default = "atlas_user"
}

# ── Redis ───────────────────────────────────────────────────────

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

# ── TLS ──────────────────────────────────────────────────────────

variable "acm_certificate_arn" {
  description = "Existing ACM certificate ARN in var.aws_region for the ALB HTTPS listener. Leave empty and set route53_zone_id instead to have Terraform create + DNS-validate one."
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Existing Route53 public hosted zone ID — only used when acm_certificate_arn is empty."
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "FQDN for the backend (e.g. api-staging.example.com) — required only when route53_zone_id is set."
  type        = string
  default     = ""
}

# ── Optional / cost-affecting toggles ───────────────────────────

variable "enable_waf" {
  description = "Attach AWS WAF (Core rule set) to the ALB. Security Groups already provide L3/L4 firewalling; enable this only if Amazon's reviewer specifically expects an L7 WAF. Adds ~$8-10/mo."
  type        = bool
  default     = false
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "alarm_notification_email" {
  description = "Optional email for the SNS topic that CloudWatch alarms publish to. Leave empty to skip alarm notifications (alarms still exist, just unsubscribed)."
  type        = string
  default     = ""
}

# ── Non-sensitive app config (real secrets live in Secrets Manager, see secrets.tf) ──

variable "amazon_sp_api_sandbox_client_id" {
  description = "SANDBOX app LWA client id (sandbox-health check only) — not sensitive on its own without the client secret. The production client id comes from Secrets Manager."
  type        = string
  default     = ""
}

variable "amazon_sp_api_application_id" {
  description = "PRODUCTION Amazon SP-API app Application ID (Solution ID) — builds the seller-consent URL."
  type        = string
  default     = ""
}

variable "amazon_sp_api_auth_version_beta" {
  description = "Append version=beta to Amazon authorization URLs. Keep true while the production app is Draft; set false only once Amazon shows it as Published."
  type        = bool
  default     = true
}

variable "amazon_sp_api_redirect_uri" {
  type    = string
  default = ""
}

variable "cors_origins" {
  description = "Comma-separated frontend origin(s) allowed to call this API."
  type        = string
  default     = ""
}

variable "redis_tls" {
  description = "Enable TLS for Redis connections"
  type        = bool
  default     = false
}

# ── Frontend (Amplify Hosting, see amplify.tf) ──────────────────

variable "frontend_repository_url" {
  description = "GitHub repository Amplify builds the frontend from."
  type        = string
  default     = "https://github.com/ruphStudy/ATLAS_NEW"
}

variable "frontend_branch" {
  description = "Git branch Amplify builds and serves on the staging domain."
  type        = string
  default     = "ATLAS-11"
}

variable "frontend_app_root" {
  description = "Path of the Next.js app inside the repository (monorepo app root)."
  type        = string
  default     = "atlas/frontend"
}

variable "frontend_root_domain" {
  description = "Route53 public hosted zone (in this account) that holds the frontend domain."
  type        = string
  default     = "codeexpoglobal.com"
}

variable "frontend_subdomain" {
  description = "Sub-domain prefix for the frontend (staging → staging.codeexpoglobal.com)."
  type        = string
  default     = "staging"
}

variable "frontend_api_url" {
  description = "NEXT_PUBLIC_API_URL baked into the frontend build."
  type        = string
  default     = "https://api-staging.codeexpoglobal.com/api/v1"
}

variable "amplify_github_access_token" {
  description = "GitHub token used ONCE when the Amplify app is created to install the AWS Amplify GitHub App. Never commit it — pass via TF_VAR_amplify_github_access_token at apply time and revoke afterwards. Ignored after creation."
  type        = string
  default     = null
  sensitive   = true
}