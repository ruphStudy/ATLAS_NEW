terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # No remote backend configured yet — state is local by default (see README
  # "Remote state" section). Local state contains resource metadata only;
  # no secret VALUES are ever written to Terraform state (see secrets.tf).
  # backend "s3" {
  #   bucket         = "atlas-terraform-state-<account-id>"
  #   key            = "amazon-security-slice/terraform.tfstate"
  #   region         = "ap-south-1"
  #   dynamodb_table = "atlas-terraform-locks"
  #   encrypt        = true
  # }
}
