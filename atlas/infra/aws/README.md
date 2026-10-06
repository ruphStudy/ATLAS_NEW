# ATLAS — Amazon SP-API Network Security Compliance Slice

Minimal, single-environment AWS stack: ALB → ECS Fargate (existing backend
image, unmodified) → RDS Postgres + ElastiCache Redis, all in private
subnets. Not the full 11-module deployment — one small reusable
staging/production-like slice sized to satisfy Amazon's rejected
requirement ("firewall, IDS/IPS, anti-virus/anti-malware, network
segmentation").

## What satisfies what

| Requirement | Control |
|---|---|
| Firewall | Security Groups (stateful, per-tier) + NACLs (`security_groups.tf`, `network_acls.tf`) + optional WAF (`waf.tf`) |
| Network segmentation | Public (ALB only) vs private (app/db/cache) subnets, no route in except via ALB SG chain (`vpc.tf`) |
| IDS/IPS | GuardDuty (`guardduty.tf`) |
| Anti-malware | ECR scan-on-push (`ecr.tf`) + GuardDuty S3 Malware Protection on the ALB-logs bucket (`guardduty.tf`) |
| HTTPS/TLS | ALB HTTPS listener, TLS1.2+ policy, HTTP→HTTPS redirect (`alb.tf`, `acm.tf`) |
| Logging/monitoring | VPC Flow Logs, ALB access logs, ECS/RDS logs → CloudWatch, CloudTrail, alarms (`vpc.tf`, `alb.tf`, `cloudwatch.tf`, `cloudtrail.tf`) |
| Secure secret storage | Secrets Manager, no plaintext in Terraform state for anything business-sensitive (`secrets.tf`) |
| Private DB/network access | RDS + Redis private-subnet only, SG-restricted to ECS (`rds.tf`, `elasticache.tf`, `security_groups.tf`) |

## Estimated monthly cost (ap-south-1, single-AZ, this slice only)

| Item | ~USD/mo |
|---|---|
| ALB | 16 |
| NAT Gateway (single) | 33 |
| ECS Fargate (0.25 vCPU/0.5GB, 1 task, always on) | 9 |
| RDS db.t4g.micro, 20GB gp3 | 13 |
| ElastiCache cache.t4g.micro | 11 |
| GuardDuty + Malware Protection | 5 |
| Secrets Manager (6 secrets) | 2.5 |
| CloudWatch Logs/alarms + S3 (logs) | 3 |
| CloudTrail | 0 (first trail, management events) |
| **Total** | **~$92/mo (~₹7,700/mo)** |

WAF, if enabled, adds ~$8-10/mo. Multi-AZ NAT/RDS (full production later) roughly doubles the NAT/RDS lines.

## Mandatory vs optional

- Mandatory: VPC/subnets/SGs/NACLs, ALB+TLS, ECS+RDS+Redis private placement, Secrets Manager, CloudWatch logs, GuardDuty, ECR scanning, CloudTrail.
- Optional/recommended: WAF (`enable_waf`), alarm email subscription, multi-AZ NAT/RDS, customer-managed KMS key (currently AWS-managed keys, no extra cost).

## What can be tested locally first (no AWS)

- Full app already runs via root `docker-compose.yml` (Postgres + Redis + backend + frontend) — verify auth/MFA/password-lifecycle and Amazon sandbox flows there first.
- `docker build -f docker/backend/Dockerfile --target production ./backend` — confirms the exact image ECS will run builds and starts locally, including `/health/liveness`.
- `terraform validate` / `terraform plan` (needs AWS creds only for `plan`, not for `validate`) — catches config errors before touching the account.
- Point a local backend at a temporary throwaway RDS-shaped Postgres with `sslmode=require` to sanity-check the `DATABASE_URL` format this stack generates.

## Deployment order

1. **You**: create/confirm an AWS account + an IAM principal with admin (or scoped) access for Terraform, and configure credentials locally (`aws configure` or env vars) — see "Manual steps" below.
2. `terraform init`
3. Copy `terraform.tfvars.example` → `terraform.tfvars`, fill in (pick a TLS option).
4. `terraform apply` — creates everything except real secret values and the app image.
5. **You**: populate the 5 manual secrets (exact commands below) + confirm the auto-generated `database-url`/`redis-auth-token` look correct.
6. Build + push the backend image:
   ```
   aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
   docker build -f docker/backend/Dockerfile --target production -t <ecr_repository_url>:latest ./backend
   docker push <ecr_repository_url>:latest
   ```
7. Force a new ECS deployment so it picks up the pushed image:
   ```
   aws ecs update-service --cluster atlas-staging-cluster --service atlas-staging-backend --force-new-deployment
   ```
8. Run Prisma migrations against the new `DATABASE_URL` once (`npx prisma migrate deploy`), from a machine that can reach the private subnet (e.g. temporarily via a bastion, SSM Session Manager on a throwaway instance, or CI with a VPC-attached runner) — RDS is intentionally not publicly reachable.
9. Verify `https://<alb_dns_name or your domain>/health/liveness` returns 200.

## Manual steps (require AWS account access — stop here until done)

1. Configure AWS credentials locally: `aws configure` (Access Key ID + Secret + region), or `export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=...`. This is the exact point Terraform needs real AWS account access — nothing above this requires it.
2. If using Option A for TLS: request/import the cert in ACM Console first and put its ARN in `terraform.tfvars`.
3. After `apply`, populate the manual secrets (values only you should generate/hold):
   ```
   aws secretsmanager put-secret-value --secret-id atlas/staging/jwt-access-secret --secret-string "<32+ char random>"
   aws secretsmanager put-secret-value --secret-id atlas/staging/jwt-refresh-secret --secret-string "<different 32+ char random>"
   aws secretsmanager put-secret-value --secret-id atlas/staging/atlas-credential-key --secret-string "<32+ char random>"
   aws secretsmanager put-secret-value --secret-id atlas/staging/amazon-sp-api-client-secret --secret-string "<from Amazon Developer Console>"
   aws secretsmanager put-secret-value --secret-id atlas/staging/amazon-sp-api-sandbox-refresh-token --secret-string "<from Amazon Developer Console>"
   ```
4. If `alarm_notification_email` is set: confirm the SNS subscription email AWS sends you.

## Evidence/screenshots to keep for Amazon

- Security Groups list + one rule detail per tier (showing source = another SG, not 0.0.0.0/0) for ALB/ECS/RDS/Redis.
- VPC resource map (Console → VPC → "Resource Map") showing public/private subnet split.
- GuardDuty "Summary" page showing it's enabled + finding count (0 findings is fine, "enabled" is the point).
- ECR repository "Scan on push: Enabled" + one image's scan results page.
- ACM certificate detail page (domain, status "Issued", TLS version on the ALB listener).
- CloudWatch Logs console showing the backend log group + VPC Flow Logs group with recent entries.
- CloudTrail "Trails" page showing the trail, status "Logging".
- Secrets Manager list showing all secrets encrypted, no console "view secret value" screenshot (never capture values).
- RDS instance detail: "Public accessibility: No", "Encryption: Enabled".
