# Staging frontend: the Next.js app in atlas/frontend, hosted on AWS Amplify
# Hosting with the SSR runtime (platform WEB_COMPUTE), built from GitHub on
# every push to var.frontend_branch, served at
# https://<frontend_subdomain>.<frontend_root_domain> with an Amplify-managed
# TLS certificate.
#
# GitHub connection: Amplify connects to GitHub through the "AWS Amplify"
# GitHub App. `access_token` is used ONLY when the app is created, to install/
# authorize that GitHub App and its webhook — Amplify does not keep using it.
# It is never committed: pass it at apply time via
# TF_VAR_amplify_github_access_token, then revoke it. Later plans ignore it
# (see lifecycle below).

locals {
  frontend_origin = "https://${var.frontend_subdomain}.${var.frontend_root_domain}"
}

data "aws_route53_zone" "frontend" {
  name         = var.frontend_root_domain
  private_zone = false
}

# ── Service role (SSR compute logs → CloudWatch) ────────────────

data "aws_iam_policy_document" "amplify_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["amplify.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "amplify_service" {
  name               = "${var.project}-${var.environment}-amplify-service-role"
  assume_role_policy = data.aws_iam_policy_document.amplify_assume.json
}

data "aws_iam_policy_document" "amplify_logs" {
  # DescribeLogGroups does not support resource-level restriction.
  statement {
    actions = [
      "logs:DescribeLogGroups",
    ]

    resources = ["*"]
  }

  # Keep log creation/write permissions restricted to Amplify log groups.
  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]

    resources = [
      "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/amplify/*",
      "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/amplify/*:log-stream:*",
    ]
  }
}

resource "aws_iam_role_policy" "amplify_logs" {
  name   = "${var.project}-${var.environment}-amplify-logs"
  role   = aws_iam_role.amplify_service.id
  policy = data.aws_iam_policy_document.amplify_logs.json
}

# ── App ─────────────────────────────────────────────────────────

resource "aws_amplify_app" "frontend" {
  name         = "${var.project}-${var.environment}-frontend"
  repository   = var.frontend_repository_url
  access_token = var.amplify_github_access_token
  platform     = "WEB_COMPUTE" # Next.js SSR runtime — not a static export

  iam_service_role_arn = aws_iam_role.amplify_service.arn

  # atlas/ is an npm-workspaces root (backend, frontend, shared) inside the
  # repo, so install from there and build the frontend workspace only.
  #
  # --ignore-scripts prevents the root workspace prepare script from running
  # Husky during Amplify CI, where root dev dependencies are intentionally
  # not installed.
  build_spec = <<-EOT
    version: 1
    applications:
      - appRoot: ${var.frontend_app_root}
        frontend:
          phases:
            preBuild:
              commands:
                - nvm use 20
                - cd .. && npm ci --workspace=@atlas/frontend --include-workspace-root=false --ignore-scripts && cd frontend
            build:
              commands:
                - npm run build
          artifacts:
            baseDirectory: .next
            files:
              - '**/*'
          cache:
            paths:
              - .next/cache/**/*
              - ../node_modules/**/*
  EOT

  environment_variables = {
    AMPLIFY_MONOREPO_APP_ROOT = var.frontend_app_root
    NEXT_PUBLIC_API_URL       = var.frontend_api_url
    HUSKY                     = "0" # git hooks are irrelevant in CI
  }

  lifecycle {
    # Only needed once, at creation (installs the GitHub App) — never re-sent.
    ignore_changes = [access_token]
  }

  tags = {
    Name = "${var.project}-${var.environment}-frontend"
  }
}

resource "aws_amplify_branch" "frontend" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = var.frontend_branch

  framework         = "Next.js - SSR"
  stage             = "BETA"
  enable_auto_build = true

  tags = {
    Name = "${var.project}-${var.environment}-frontend-${var.frontend_branch}"
  }
}

# ── Custom domain ───────────────────────────────────────────────
# Only the `staging` sub-domain is mapped — the apex and other records in
# the zone (e.g. api-staging → ALB) are untouched. The hosted zone is in
# this account, so Amplify creates its own certificate-validation and
# sub-domain records in it; wait_for_verification = false keeps apply from
# blocking on DNS/cert propagation.

resource "aws_amplify_domain_association" "frontend" {
  app_id                = aws_amplify_app.frontend.id
  domain_name           = var.frontend_root_domain
  wait_for_verification = false

  certificate_settings {
    type = "AMPLIFY_MANAGED"
  }

  sub_domain {
    branch_name = aws_amplify_branch.frontend.branch_name
    prefix      = var.frontend_subdomain
  }
}