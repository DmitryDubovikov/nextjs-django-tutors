# =============================================================================
# PRODUCTION ENVIRONMENT - ГЛАВНЫЙ ФАЙЛ КОНФИГУРАЦИИ
# =============================================================================
#
# Этот файл настраивает:
# - Terraform backend (где хранится state)
# - AWS Provider (как подключаться к AWS)
# - Required providers (какие версии использовать)
#
# ВАЖНО О TERRAFORM STATE:
# State - это JSON файл, который Terraform использует для отслеживания
# созданных ресурсов. Без state Terraform не знает, что уже создано.
#
# Где хранить state?
# - Локально (terraform.tfstate) - только для обучения!
# - S3 + DynamoDB - рекомендуется для команд и production
#
# Почему S3 + DynamoDB?
# - S3: надёжное хранилище, версионирование, шифрование
# - DynamoDB: блокировка (locking) - предотвращает одновременные изменения
# =============================================================================

# -----------------------------------------------------------------------------
# TERRAFORM CONFIGURATION
# -----------------------------------------------------------------------------

terraform {
  # Минимальная версия Terraform
  # Используем >= чтобы работали патч-версии (1.5.1, 1.5.2 и т.д.)
  required_version = ">= 1.5.0"

  # Указываем какие провайдеры нужны и их версии
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      # ~> 5.0 означает >= 5.0.0 и < 6.0.0 (разрешены минорные обновления)
      version = "~> 5.0"
    }
  }

  # --- Backend Configuration (раскомментируйте после создания S3 bucket) ---
  # Перед использованием:
  # 1. Создайте S3 bucket: aws s3 mb s3://tutors-terraform-state-YOUR_ACCOUNT_ID
  # 2. Включите версионирование: aws s3api put-bucket-versioning ...
  # 3. Создайте DynamoDB table: aws dynamodb create-table ...
  #
  # backend "s3" {
  #   bucket         = "tutors-terraform-state"       # Имя S3 bucket
  #   key            = "prod/terraform.tfstate"       # Путь к state файлу
  #   region         = "eu-central-1"                 # Регион S3 bucket
  #   encrypt        = true                           # Шифровать state
  #   dynamodb_table = "tutors-terraform-locks"       # Таблица для блокировок
  # }
}

# -----------------------------------------------------------------------------
# AWS PROVIDER
# -----------------------------------------------------------------------------
# Provider - это плагин, который позволяет Terraform работать с конкретным
# облаком или сервисом. AWS Provider - для Amazon Web Services.
#
# Аутентификация (в порядке приоритета):
# 1. Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
# 2. Shared credentials file: ~/.aws/credentials
# 3. IAM Role (если запускаете на EC2/ECS/Lambda)
#
# Рекомендация: используйте AWS CLI profiles или IAM roles, не хардкодьте ключи!

provider "aws" {
  # Регион AWS где создавать ресурсы
  # eu-central-1 = Франкфурт (Германия) - ближайший к России
  # Другие варианты: eu-west-1 (Ирландия), us-east-1 (Вирджиния)
  region = var.aws_region

  # Теги по умолчанию для ВСЕХ ресурсов создаваемых этим провайдером
  # Очень удобно для Cost Allocation и организации ресурсов
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      # Полезно для аудита - когда и кем создано
      CreatedBy   = "terraform"
    }
  }
}

# -----------------------------------------------------------------------------
# LOCAL VALUES
# -----------------------------------------------------------------------------
# locals - это вычисляемые значения, которые можно использовать в конфигурации.
# Полезно для:
# - Уменьшения дублирования
# - Вычисления сложных значений
# - Комбинирования переменных

locals {
  # Общий префикс для имён ресурсов
  name_prefix = "${var.project_name}-${var.environment}"

  # Общие теги которые будут добавляться ко всем ресурсам
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
