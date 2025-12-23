# =============================================================================
# OUTPUTS VPC МОДУЛЯ
# =============================================================================
#
# Outputs (выходные значения) экспортируют данные из модуля для использования
# в других модулях или для отображения после terraform apply.
#
# Использование:
# - В других модулях: module.vpc.vpc_id
# - После apply: terraform output vpc_id
# - В переменных окружения: terraform output -json
#
# Почему это важно?
# Модули должны быть изолированы и взаимодействовать через outputs.
# Например, модуль ECS не должен знать, как создавался VPC - он просто
# получает vpc_id и subnet_ids через outputs.
# =============================================================================

# -----------------------------------------------------------------------------
# VPC Outputs
# -----------------------------------------------------------------------------

output "vpc_id" {
  description = <<-EOT
    ID созданного VPC.
    Используется другими ресурсами для привязки к этой сети.
    Формат: vpc-xxxxxxxxxxxxxxxxx
  EOT
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = <<-EOT
    CIDR блок VPC.
    Полезно для настройки Security Groups и Network ACL.
  EOT
  value       = aws_vpc.main.cidr_block
}

# -----------------------------------------------------------------------------
# Subnet Outputs
# -----------------------------------------------------------------------------

output "public_subnet_ids" {
  description = <<-EOT
    Список ID публичных подсетей.
    Используется для:
    - Application Load Balancer (требует минимум 2 подсети в разных AZ)
    - NAT Gateway
    - Bastion hosts

    Формат: ["subnet-xxx", "subnet-yyy"]
  EOT
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = <<-EOT
    Список ID приватных подсетей.
    Используется для:
    - ECS Tasks (контейнеры приложения)
    - RDS (база данных)
    - ElastiCache (Redis)

    Формат: ["subnet-xxx", "subnet-yyy"]
  EOT
  value       = aws_subnet.private[*].id
}

output "public_subnet_cidrs" {
  description = "CIDR блоки публичных подсетей"
  value       = aws_subnet.public[*].cidr_block
}

output "private_subnet_cidrs" {
  description = "CIDR блоки приватных подсетей"
  value       = aws_subnet.private[*].cidr_block
}

output "availability_zones" {
  description = <<-EOT
    Список используемых Availability Zones.
    Полезно для проверки, что ресурсы распределены по разным AZ.
  EOT
  value       = aws_subnet.public[*].availability_zone
}

# -----------------------------------------------------------------------------
# Gateway Outputs
# -----------------------------------------------------------------------------

output "internet_gateway_id" {
  description = <<-EOT
    ID Internet Gateway.
    Обычно не нужен другим модулям, но полезен для отладки.
  EOT
  value       = aws_internet_gateway.main.id
}

output "nat_gateway_id" {
  description = <<-EOT
    ID NAT Gateway (если создан).
    Возвращает null если NAT Gateway не создавался (create_nat_gateway = false).
  EOT
  # Используем try() для безопасного доступа - возвращает null если ресурс не существует
  value       = try(aws_nat_gateway.main[0].id, null)
}

output "nat_gateway_public_ip" {
  description = <<-EOT
    Публичный IP адрес NAT Gateway.
    Этот IP виден внешним сервисам как источник трафика из приватных подсетей.
    Полезно для добавления в whitelist внешних сервисов.
  EOT
  value       = try(aws_eip.nat[0].public_ip, null)
}

# -----------------------------------------------------------------------------
# Security Group Outputs
# -----------------------------------------------------------------------------

output "alb_security_group_id" {
  description = <<-EOT
    ID Security Group для Application Load Balancer.
    Передайте в модуль ALB для настройки входящего трафика.
  EOT
  value       = aws_security_group.alb.id
}

output "ecs_security_group_id" {
  description = <<-EOT
    ID Security Group для ECS Tasks.
    Передайте в модуль ECS для настройки контейнеров.
  EOT
  value       = aws_security_group.ecs.id
}

output "rds_security_group_id" {
  description = <<-EOT
    ID Security Group для RDS.
    Передайте в модуль RDS для настройки базы данных.
  EOT
  value       = aws_security_group.rds.id
}

output "redis_security_group_id" {
  description = <<-EOT
    ID Security Group для ElastiCache Redis.
    Передайте в модуль ElastiCache для настройки Redis.
  EOT
  value       = aws_security_group.redis.id
}

# -----------------------------------------------------------------------------
# Convenience Outputs - для удобства
# -----------------------------------------------------------------------------

output "security_group_ids" {
  description = <<-EOT
    Все Security Groups в виде map для удобного доступа.

    Использование:
      module.vpc.security_group_ids["alb"]
      module.vpc.security_group_ids["ecs"]
  EOT
  value = {
    alb   = aws_security_group.alb.id
    ecs   = aws_security_group.ecs.id
    rds   = aws_security_group.rds.id
    redis = aws_security_group.redis.id
  }
}

output "summary" {
  description = "Краткая сводка созданной инфраструктуры"
  value = {
    vpc_id             = aws_vpc.main.id
    vpc_cidr           = aws_vpc.main.cidr_block
    public_subnets     = length(aws_subnet.public)
    private_subnets    = length(aws_subnet.private)
    nat_gateway        = var.create_nat_gateway ? "enabled" : "disabled"
    availability_zones = aws_subnet.public[*].availability_zone
  }
}
