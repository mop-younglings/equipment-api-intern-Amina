provider "aws" {
  region = var.aws_region

  access_key = var.use_localstack ? "test" : null
  secret_key = var.use_localstack ? "test" : null

  dynamic "endpoints" {
    for_each = var.use_localstack ? [1] : []
    content {
      ec2            = var.localstack_endpoint
      ecs            = var.localstack_endpoint
      ecr            = var.localstack_endpoint
      elb            = var.localstack_endpoint
      elbv2          = var.localstack_endpoint
      iam            = var.localstack_endpoint
      logs           = var.localstack_endpoint
      rds            = var.localstack_endpoint
      secretsmanager = var.localstack_endpoint
      sts            = var.localstack_endpoint
    }
  }

  skip_credentials_validation = var.use_localstack
  skip_metadata_api_check     = var.use_localstack
  skip_requesting_account_id  = var.use_localstack
  s3_use_path_style           = var.use_localstack
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}
