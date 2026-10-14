# Staging frontend: the Next.js app in atlas/frontend, hosted on AWS Amplify
# Hosting with the SSR runtime (platform WEB_COMPUTE), built from GitHub on
# every push to var.frontend_branch, served at
# https://<frontend_subdomain>.<frontend_root_domain> with an Amplify-managed
# TLS certificate.
#
# GitHub connection: this Amplify app currently uses token-based repository
# access (repositoryCloneMethod = TOKEN). `access_token` is used when the app
# is created to authorize repository access and configure the connection.
# It is never committed: pass it at apply time via
# TF_VAR_amplify_github_access_token. Later plans ignore it
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

  # Repository layout:
  #
  #   repo root/
  #   └── atlas/                <- npm workspace root
  #       ├── package.json
  #       ├── node_modules/
  #       ├── frontend/         <- Next.js application
  #       ├── backend/
  #       └── shared/
  #
  # Amplify therefore uses /atlas as the build path. npm install and the
  # frontend workspace build both run directly from the npm workspace root.
  #
  # The frontend uses Next.js standalone output. Amplify currently has a
  # packaging issue with some nested monorepo layouts where Next.js exists
  # in the workspace node_modules directory but is not detected inside
  # .next/standalone/node_modules during deployment validation.
  #
  # The postBuild phase explicitly places Next.js and its @next runtime
  # packages into the standalone node_modules directory before Amplify
  # packages the SSR runtime.
  #
  # --ignore-scripts prevents the root workspace prepare script from running
  # Husky during Amplify CI.
  build_spec = <<-EOT
    version: 1
    applications:
      - appRoot: ${var.frontend_app_root}
        frontend:
          buildPath: /atlas
          phases:
            preBuild:
              commands:
                - nvm use 20
                - npm ci --ignore-scripts

            build:
              commands:
                - npm run build --workspace=@atlas/frontend

            postBuild:
              commands:
                - echo "Preparing Next.js standalone runtime for Amplify"
                - test -f node_modules/next/package.json
                - test -d frontend/.next/standalone
                - mkdir -p frontend/.next/standalone/node_modules
                - rm -rf frontend/.next/standalone/node_modules/next
                - cp -R node_modules/next frontend/.next/standalone/node_modules/next
                - if [ -d node_modules/@next ]; then rm -rf frontend/.next/standalone/node_modules/@next && cp -R node_modules/@next frontend/.next/standalone/node_modules/@next; fi
                - test -f frontend/.next/standalone/node_modules/next/package.json
                - echo "Next.js standalone runtime dependency verified"

          artifacts:
            baseDirectory: frontend/.next
            files:
              - '**/*'

          cache:
            paths:
              - node_modules/**/*
              - frontend/.next/cache/**/*

  EOT

  environment_variables = {
    AMPLIFY_MONOREPO_APP_ROOT = var.frontend_app_root
    NEXT_PUBLIC_API_URL       = var.frontend_api_url
    HUSKY                     = "0" # git hooks are irrelevant in CI
  }

  lifecycle {
    # Repository token is required during initial connection setup and should
    # not be continually re-sent or cause Terraform drift afterward.
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