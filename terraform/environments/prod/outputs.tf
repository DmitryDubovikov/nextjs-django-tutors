# =============================================================================
# OUTPUTS PRODUCTION ENVIRONMENT
# =============================================================================
#
# Выходные значения Phase 1.
# После terraform apply эти значения будут показаны в консоли.
# Также их можно получить командой: terraform output
#
# Эти значения понадобятся для следующих фаз:
# - Phase 2 (Data Layer): private_subnet_ids, security_group_ids
# - Phase 4 (ECS): все subnet и security group IDs
# - Phase 5 (ALB): public_subnet_ids, alb_security_group_id
# =============================================================================

# -----------------------------------------------------------------------------
# VPC Outputs
# -----------------------------------------------------------------------------

output "vpc_id" {
  description = "ID VPC - понадобится для всех последующих ресурсов"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "CIDR блок VPC"
  value       = module.vpc.vpc_cidr
}

# -----------------------------------------------------------------------------
# Subnet Outputs
# -----------------------------------------------------------------------------

output "public_subnet_ids" {
  description = <<-EOT
    IDs публичных подсетей.
    Используйте для: ALB, NAT Gateway, Bastion hosts
  EOT
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = <<-EOT
    IDs приватных подсетей.
    Используйте для: ECS Tasks, RDS, ElastiCache
  EOT
  value       = module.vpc.private_subnet_ids
}

output "availability_zones" {
  description = "Используемые Availability Zones"
  value       = module.vpc.availability_zones
}

# -----------------------------------------------------------------------------
# Security Group Outputs
# -----------------------------------------------------------------------------

output "alb_security_group_id" {
  description = "Security Group ID для ALB"
  value       = module.vpc.alb_security_group_id
}

output "ecs_security_group_id" {
  description = "Security Group ID для ECS Tasks"
  value       = module.vpc.ecs_security_group_id
}

output "rds_security_group_id" {
  description = "Security Group ID для RDS"
  value       = module.vpc.rds_security_group_id
}

output "redis_security_group_id" {
  description = "Security Group ID для ElastiCache Redis"
  value       = module.vpc.redis_security_group_id
}

# -----------------------------------------------------------------------------
# NAT Gateway Outputs
# -----------------------------------------------------------------------------

output "nat_gateway_id" {
  description = "NAT Gateway ID (null если не создан)"
  value       = module.vpc.nat_gateway_id
}

output "nat_gateway_public_ip" {
  description = <<-EOT
    Публичный IP NAT Gateway.
    Этот IP будет виден внешним сервисам как источник трафика.
    Добавьте его в whitelist если нужно.
  EOT
  value       = module.vpc.nat_gateway_public_ip
}

# -----------------------------------------------------------------------------
# Summary Output
# -----------------------------------------------------------------------------

output "phase1_summary" {
  description = "Сводка созданных ресурсов Phase 1"
  value       = <<-EOT

    ╔═══════════════════════════════════════════════════════════════╗
    ║                 PHASE 1: VPC INFRASTRUCTURE                   ║
    ╠═══════════════════════════════════════════════════════════════╣
    ║  VPC ID:              ${module.vpc.vpc_id}
    ║  VPC CIDR:            ${module.vpc.vpc_cidr}
    ║
    ║  Public Subnets:      ${join(", ", module.vpc.public_subnet_ids)}
    ║  Private Subnets:     ${join(", ", module.vpc.private_subnet_ids)}
    ║
    ║  Availability Zones:  ${join(", ", module.vpc.availability_zones)}
    ║
    ║  NAT Gateway IP:      ${coalesce(module.vpc.nat_gateway_public_ip, "not created")}
    ║
    ║  Security Groups:
    ║    - ALB:   ${module.vpc.alb_security_group_id}
    ║    - ECS:   ${module.vpc.ecs_security_group_id}
    ║    - RDS:   ${module.vpc.rds_security_group_id}
    ║    - Redis: ${module.vpc.redis_security_group_id}
    ╚═══════════════════════════════════════════════════════════════╝

    Next steps:
    1. Run: terraform output -json > phase1-outputs.json
    2. Proceed to Phase 2: terraform apply -target=module.rds -target=module.elasticache

  EOT
}
