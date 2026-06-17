variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)."
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Short project name used in resource naming."
  type        = string
  default     = "equipment-api"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones for subnets. Leave empty to use the first two AZs in the region."
  type        = list(string)
  default     = []
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (ALB, NAT gateway)."
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets (ECS tasks, RDS)."
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

variable "db_name" {
  description = "PostgreSQL database name."
  type        = string
  default     = "equipment_api"
}

variable "db_username" {
  description = "PostgreSQL master username."
  type        = string
  default     = "equipment"
}

variable "db_password" {
  description = "PostgreSQL master password. Leave empty to auto-generate."
  type        = string
  sensitive   = true
  default     = null
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GiB."
  type        = number
  default     = 20
}

variable "db_backup_retention_period" {
  description = "Number of days to retain automated RDS backups."
  type        = number
  default     = 7
}

variable "jwt_secret" {
  description = "JWT signing secret for the application. Leave empty to auto-generate."
  type        = string
  sensitive   = true
  default     = null
}

variable "jwt_expires_in" {
  description = "JWT token expiration (passed to the app as JWT_EXPIRES_IN)."
  type        = string
  default     = "1d"
}

variable "cors_origin" {
  description = "Allowed CORS origin for the API."
  type        = string
  default     = "*"
}

variable "run_migrations" {
  description = "Whether the container entrypoint runs database migrations on startup."
  type        = bool
  default     = true
}

variable "app_port" {
  description = "Application listen port inside the container."
  type        = number
  default     = 3000
}

variable "app_image_tag" {
  description = "Docker image tag to deploy from ECR. Use a commit SHA or semver tag in production."
  type        = string
  default     = "latest"
}

variable "desired_count" {
  description = "Number of ECS tasks to run."
  type        = number
  default     = 1
}

variable "task_cpu" {
  description = "Fargate task CPU units (256 = 0.25 vCPU)."
  type        = number
  default     = 256
}

variable "task_memory" {
  description = "Fargate task memory in MiB."
  type        = number
  default     = 512
}

variable "health_check_path" {
  description = "ALB target group health check path."
  type        = string
  default     = "/api-json"
}

variable "enable_https" {
  description = "Create an HTTPS listener on the ALB. Requires acm_certificate_arn."
  type        = bool
  default     = false
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for the HTTPS listener."
  type        = string
  default     = null
}

variable "ecr_image_retention_count" {
  description = "Number of images to retain in ECR."
  type        = number
  default     = 10
}

variable "log_retention_days" {
  description = "CloudWatch log retention for ECS tasks."
  type        = number
  default     = 14
}

variable "use_localstack" {
  description = "Point the AWS provider at LocalStack for local validation."
  type        = bool
  default     = false
}

variable "localstack_endpoint" {
  description = "LocalStack base URL when use_localstack is true."
  type        = string
  default     = "http://localhost:4566"
}

variable "tags" {
  description = "Additional tags applied to all taggable resources."
  type        = map(string)
  default     = {}
}
