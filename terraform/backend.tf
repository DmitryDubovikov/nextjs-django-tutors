# =============================================================================
# TERRAFORM BACKEND BOOTSTRAP
# =============================================================================
#
# Этот файл содержит конфигурацию для создания S3 backend для Terraform state.
#
# ЧТО ТАКОЕ TERRAFORM STATE?
# State - это JSON файл, в котором Terraform хранит информацию о созданных
# ресурсах. Это "источник правды" о вашей инфраструктуре.
#
# Содержимое state:
# - ID всех созданных ресурсов (vpc-xxx, subnet-yyy, ...)
# - Текущие значения атрибутов ресурсов
# - Зависимости между ресурсами
# - Метаданные (версия Terraform, провайдеров)
#
# ПОЧЕМУ НУЖЕН REMOTE BACKEND?
# Локальный state (terraform.tfstate) имеет проблемы:
# 1. Нельзя работать в команде (конфликты при одновременных изменениях)
# 2. Нет версионирования (случайно удалил - потерял)
# 3. Нет шифрования (state содержит чувствительные данные!)
# 4. Нет блокировки (два человека могут запустить apply одновременно)
#
# S3 + DynamoDB решает все эти проблемы:
# - S3: надёжное хранилище с версионированием и шифрованием
# - DynamoDB: распределённая блокировка (locking)
#
# =============================================================================
# ИНСТРУКЦИЯ ПО НАСТРОЙКЕ BACKEND
# =============================================================================
#
# 1. Создайте S3 bucket для state (замените YOUR_ACCOUNT_ID):
#
#    aws s3 mb s3://tutors-terraform-state-YOUR_ACCOUNT_ID --region eu-central-1
#
# 2. Включите версионирование:
#
#    aws s3api put-bucket-versioning \
#      --bucket tutors-terraform-state-YOUR_ACCOUNT_ID \
#      --versioning-configuration Status=Enabled
#
# 3. Включите шифрование:
#
#    aws s3api put-bucket-encryption \
#      --bucket tutors-terraform-state-YOUR_ACCOUNT_ID \
#      --server-side-encryption-configuration '{
#        "Rules": [{
#          "ApplyServerSideEncryptionByDefault": {
#            "SSEAlgorithm": "AES256"
#          }
#        }]
#      }'
#
# 4. Заблокируйте публичный доступ:
#
#    aws s3api put-public-access-block \
#      --bucket tutors-terraform-state-YOUR_ACCOUNT_ID \
#      --public-access-block-configuration \
#        BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
#
# 5. Создайте DynamoDB таблицу для блокировок:
#
#    aws dynamodb create-table \
#      --table-name tutors-terraform-locks \
#      --attribute-definitions AttributeName=LockID,AttributeType=S \
#      --key-schema AttributeName=LockID,KeyType=HASH \
#      --billing-mode PAY_PER_REQUEST \
#      --region eu-central-1
#
# 6. Раскомментируйте backend блок в terraform/environments/prod/main.tf
#
# 7. Инициализируйте с миграцией state:
#
#    terraform init -migrate-state
#
# =============================================================================

# Этот файл - документация и инструкция.
# Реальная конфигурация backend находится в environments/*/main.tf

# Ниже приведён Terraform код для автоматического создания backend ресурсов.
# Но его нужно запускать ОДИН РАЗ вручную перед настройкой backend.
# Это "курица и яйцо" - нельзя хранить state создания backend в самом backend.

# =============================================================================
# BOOTSTRAP RESOURCES (запустите вручную один раз)
# =============================================================================
#
# Раскомментируйте и запустите:
#   cd terraform
#   terraform init
#   terraform apply -target=aws_s3_bucket.terraform_state \
#                   -target=aws_dynamodb_table.terraform_locks
#
# После создания закомментируйте обратно и настройте backend.

/*
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "eu-central-1"
}

# -----------------------------------------------------------------------------
# S3 BUCKET ДЛЯ TERRAFORM STATE
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "terraform_state" {
  # Имя bucket должно быть глобально уникальным
  # Рекомендуется добавить account ID или случайный суффикс
  bucket = "tutors-terraform-state-${data.aws_caller_identity.current.account_id}"

  # Не удалять bucket если в нём есть файлы
  # Защита от случайного terraform destroy
  force_destroy = false

  tags = {
    Name        = "Terraform State"
    Environment = "global"
    ManagedBy   = "terraform"
  }
}

# Получаем ID текущего AWS аккаунта
data "aws_caller_identity" "current" {}

# Включаем версионирование для отката к предыдущим версиям state
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Шифруем state at rest (содержит чувствительные данные!)
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Блокируем публичный доступ (state не должен быть публичным!)
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# -----------------------------------------------------------------------------
# DYNAMODB TABLE ДЛЯ STATE LOCKING
# -----------------------------------------------------------------------------
# Блокировка предотвращает одновременные terraform apply от разных пользователей

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "tutors-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"  # Платим только за использование

  # LockID - обязательное поле для Terraform locking
  hash_key = "LockID"

  attribute {
    name = "LockID"
    type = "S"  # String
  }

  tags = {
    Name        = "Terraform Locks"
    Environment = "global"
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# OUTPUTS
# -----------------------------------------------------------------------------

output "state_bucket_name" {
  description = "Имя S3 bucket для Terraform state"
  value       = aws_s3_bucket.terraform_state.id
}

output "state_bucket_arn" {
  description = "ARN S3 bucket"
  value       = aws_s3_bucket.terraform_state.arn
}

output "locks_table_name" {
  description = "Имя DynamoDB таблицы для блокировок"
  value       = aws_dynamodb_table.terraform_locks.name
}

output "backend_config" {
  description = "Конфигурация для добавления в main.tf"
  value       = <<-EOT

    # Добавьте в terraform/environments/prod/main.tf:

    backend "s3" {
      bucket         = "${aws_s3_bucket.terraform_state.id}"
      key            = "prod/terraform.tfstate"
      region         = "eu-central-1"
      encrypt        = true
      dynamodb_table = "${aws_dynamodb_table.terraform_locks.name}"
    }

  EOT
}
*/
