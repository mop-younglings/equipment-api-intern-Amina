resource "random_password" "db" {
  count = var.db_password == null ? 1 : 0

  length  = 32
  special = false
}

resource "random_password" "jwt" {
  count = var.jwt_secret == null ? 1 : 0

  length  = 64
  special = false
}

locals {
  db_password_value = coalesce(var.db_password, try(random_password.db[0].result, ""))
  jwt_secret_value  = coalesce(var.jwt_secret, try(random_password.jwt[0].result, ""))
}

resource "aws_secretsmanager_secret" "app" {
  name                    = "${local.name_prefix}/app"
  recovery_window_in_days = var.use_localstack ? 0 : 7

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    DB_PASSWORD = local.db_password_value
    JWT_SECRET  = local.jwt_secret_value
  })
}
