# IDS/IPS-equivalent requirement: GuardDuty is AWS's managed threat-
# detection service (VPC Flow Logs + DNS logs + CloudTrail analysis for
# reconnaissance, credential compromise, C2 traffic, etc.) — the correct,
# cheap, legitimate substitute for a self-hosted Snort/Suricata IDS on a
# workload this small. ~$4-5/mo at this traffic volume.
#
# Malware Protection for EC2/EBS is intentionally NOT enabled — this stack
# has no EC2/EBS surface (Fargate only). S3 Malware Protection is enabled
# on the one bucket this stack creates (ALB access logs).

resource "aws_guardduty_detector" "main" {
  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES"
}

resource "aws_guardduty_malware_protection_plan" "alb_logs" {
  role = aws_iam_role.guardduty_malware_protection.arn
  protected_resource {
    s3_bucket {
      bucket_name = aws_s3_bucket.alb_logs.id
    }
  }
}

resource "aws_iam_role" "guardduty_malware_protection" {
  name = "${var.project}-${var.environment}-guardduty-malware-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "malware-protection-plan.guardduty.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "guardduty_malware_protection" {
  name = "${var.project}-${var.environment}-guardduty-malware-policy"
  role = aws_iam_role.guardduty_malware_protection.id
  policy = jsonencode({
  Version = "2012-10-17"
  Statement = [
    {
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObjectTagging",
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:GetBucketNotification",
        "s3:PutBucketNotification"
      ]
      Resource = [
        aws_s3_bucket.alb_logs.arn,
        "${aws_s3_bucket.alb_logs.arn}/*"
      ]
    },
    {
      Effect = "Allow"
      Action = [
        "events:PutRule",
        "events:DeleteRule",
        "events:PutTargets",
        "events:RemoveTargets"
      ]
      Resource = "arn:aws:events:${var.aws_region}:${data.aws_caller_identity.current.account_id}:rule/DO-NOT-DELETE-AmazonGuardDutyMalwareProtectionS3*"
    }
  ]
})
}
