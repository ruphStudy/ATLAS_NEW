provider "aws" {
  region = var.aws_region

  assume_role {
    role_arn     = "arn:aws:iam::737759272574:role/CodeExpo-ATLAS-TerraformDeployRole"
    session_name = "atlas-terraform"
  }

  default_tags {
    tags = {
      Project     = "atlas"
      Slice       = "amazon-auth-security"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}