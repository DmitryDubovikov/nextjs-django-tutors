# =============================================================================
# VPC MODULE - ОСНОВНОЙ ФАЙЛ ИНФРАСТРУКТУРЫ
# =============================================================================
#
# Этот модуль создаёт базовую сетевую инфраструктуру AWS:
# - VPC (Virtual Private Cloud) - изолированная виртуальная сеть
# - Публичные подсети - для ресурсов с доступом из интернета (ALB)
# - Приватные подсети - для защищённых ресурсов (ECS, RDS, Redis)
# - Internet Gateway - точка выхода в интернет для публичных подсетей
# - NAT Gateway - позволяет приватным ресурсам ходить в интернет
# - Route Tables - таблицы маршрутизации трафика
#
# Архитектура:
#   Internet
#      │
#      ▼
#   Internet Gateway
#      │
#   ┌──┴──────────────────────────────────────────┐
#   │  VPC (10.0.0.0/16)                          │
#   │  ┌──────────────┐  ┌──────────────┐         │
#   │  │Public Subnet │  │Public Subnet │  ← ALB  │
#   │  │  10.0.1.0/24 │  │  10.0.2.0/24 │         │
#   │  │    (AZ-a)    │  │    (AZ-b)    │         │
#   │  └──────┬───────┘  └──────────────┘         │
#   │         │                                    │
#   │      NAT GW                                  │
#   │         │                                    │
#   │  ┌──────┴───────┐  ┌──────────────┐         │
#   │  │Private Subnet│  │Private Subnet│ ← ECS   │
#   │  │ 10.0.10.0/24 │  │ 10.0.20.0/24 │   RDS   │
#   │  │    (AZ-a)    │  │    (AZ-b)    │   Redis │
#   │  └──────────────┘  └──────────────┘         │
#   └─────────────────────────────────────────────┘
# =============================================================================

# -----------------------------------------------------------------------------
# DATA SOURCES - Получаем информацию о доступных зонах доступности
# -----------------------------------------------------------------------------
# data source позволяет получить информацию из AWS, не создавая ресурсы.
# Здесь мы запрашиваем список всех Availability Zones в выбранном регионе.
# AZ (Availability Zone) - это физически изолированный дата-центр внутри региона.
# Размещение ресурсов в разных AZ обеспечивает отказоустойчивость.

data "aws_availability_zones" "available" {
  # Фильтруем только активные зоны (исключаем deprecated)
  state = "available"
}

# -----------------------------------------------------------------------------
# VPC - Virtual Private Cloud (Виртуальное приватное облако)
# -----------------------------------------------------------------------------
# VPC - это изолированная виртуальная сеть в AWS. Все ваши ресурсы
# (серверы, базы данных, балансировщики) живут внутри VPC.
#
# CIDR блок 10.0.0.0/16 означает:
# - 10.0.x.x - диапазон IP адресов
# - /16 - маска сети, даёт нам 65,536 IP адресов (2^16)
# - Это приватные IP адреса (RFC 1918), не маршрутизируются в интернет
#
# Почему /16? Это стандартный размер для production VPC:
# - Достаточно большой для роста
# - Легко делить на подсети (/24 = 256 адресов)

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr

  # DNS Support - позволяет ресурсам внутри VPC резолвить DNS имена
  # Необходимо для работы с AWS сервисами (RDS, ElastiCache и т.д.)
  enable_dns_support = true

  # DNS Hostnames - AWS автоматически присваивает DNS имена EC2 инстансам
  # Формат: ip-10-0-1-5.eu-central-1.compute.internal
  enable_dns_hostnames = true

  # Теги - метаданные для организации и поиска ресурсов
  # Name - отображается в AWS Console
  tags = {
    Name        = "${var.project_name}-${var.environment}-vpc"
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# INTERNET GATEWAY - Шлюз в интернет
# -----------------------------------------------------------------------------
# Internet Gateway (IGW) - это точка входа/выхода для трафика между
# VPC и интернетом. Без IGW ресурсы в VPC не могут общаться с интернетом.
#
# Важно: IGW сам по себе не даёт доступ в интернет. Нужно ещё:
# 1. Route Table с маршрутом 0.0.0.0/0 → IGW
# 2. Публичный IP адрес на ресурсе (или через NAT)

resource "aws_internet_gateway" "main" {
  # Привязываем IGW к нашему VPC
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "${var.project_name}-${var.environment}-igw"
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# PUBLIC SUBNETS - Публичные подсети
# -----------------------------------------------------------------------------
# Публичные подсети - это подсети с прямым доступом в интернет.
# Сюда размещают ресурсы, которым нужен входящий трафик из интернета:
# - Application Load Balancer (ALB)
# - Bastion hosts (jump servers)
# - NAT Gateway
#
# Мы создаём 2 подсети в разных AZ для высокой доступности (HA):
# - Если одна AZ упадёт, сервис продолжит работать через вторую
# - ALB требует минимум 2 подсети в разных AZ
#
# count = 2 создаёт 2 идентичных ресурса с индексами [0] и [1]
# cidrsubnet() - функция для вычисления CIDR подсети:
# - cidrsubnet("10.0.0.0/16", 8, 1) = "10.0.1.0/24"
# - cidrsubnet("10.0.0.0/16", 8, 2) = "10.0.2.0/24"

resource "aws_subnet" "public" {
  count = 2

  vpc_id = aws_vpc.main.id

  # Вычисляем CIDR для каждой подсети
  # 8 - добавляем 8 бит к маске (/16 + 8 = /24)
  # count.index + 1 - номер подсети (1, 2)
  cidr_block = cidrsubnet(var.vpc_cidr, 8, count.index + 1)

  # Размещаем подсети в разных AZ для отказоустойчивости
  availability_zone = data.aws_availability_zones.available.names[count.index]

  # Автоматически назначать публичный IP при запуске инстанса
  # Это нужно для ресурсов, которым нужен прямой доступ из интернета
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.project_name}-${var.environment}-public-${count.index + 1}"
    Project     = var.project_name
    Environment = var.environment
    Type        = "public"
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# PRIVATE SUBNETS - Приватные подсети
# -----------------------------------------------------------------------------
# Приватные подсети - это подсети БЕЗ прямого доступа из интернета.
# Сюда размещают ресурсы, которые не должны быть доступны напрямую:
# - ECS Tasks (контейнеры приложения)
# - RDS (база данных)
# - ElastiCache (Redis)
#
# Ресурсы в приватных подсетях могут ходить в интернет через NAT Gateway,
# но входящий трафик из интернета напрямую к ним попасть не может.
# Это важно для безопасности - база данных не должна быть доступна из интернета!
#
# CIDR блоки: 10.0.10.0/24 и 10.0.20.0/24
# Специально используем другую нумерацию (10, 20) чтобы легко отличать
# публичные (1, 2) от приватных (10, 20) подсетей.

resource "aws_subnet" "private" {
  count = 2

  vpc_id = aws_vpc.main.id

  # CIDR для приватных подсетей: 10.0.10.0/24, 10.0.20.0/24
  # (count.index + 1) * 10 даёт 10, 20
  cidr_block = cidrsubnet(var.vpc_cidr, 8, (count.index + 1) * 10)

  # Размещаем в разных AZ для отказоустойчивости
  availability_zone = data.aws_availability_zones.available.names[count.index]

  # НЕ назначаем публичный IP - это приватные подсети
  map_public_ip_on_launch = false

  tags = {
    Name        = "${var.project_name}-${var.environment}-private-${count.index + 1}"
    Project     = var.project_name
    Environment = var.environment
    Type        = "private"
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# ELASTIC IP - Статический IP для NAT Gateway
# -----------------------------------------------------------------------------
# Elastic IP (EIP) - это статический публичный IP адрес в AWS.
# В отличие от обычных IP, EIP сохраняется даже при остановке ресурса.
#
# NAT Gateway требует EIP для работы. Этот IP будет виден внешним
# сервисам как источник всех исходящих запросов из приватных подсетей.
# Это полезно, если нужно добавить IP в whitelist внешнего сервиса.
#
# Стоимость: EIP бесплатен, пока привязан к работающему ресурсу.
# Если EIP не используется - AWS берёт ~$3.6/месяц за простой.

resource "aws_eip" "nat" {
  # Создаём EIP только если включено создание NAT Gateway
  count = var.create_nat_gateway ? 1 : 0

  # domain = "vpc" указывает, что EIP для использования внутри VPC
  # (раньше использовался параметр vpc = true, но он deprecated)
  domain = "vpc"

  # Важно: EIP нужно создать ПОСЛЕ Internet Gateway
  # Иначе AWS может выдать ошибку
  depends_on = [aws_internet_gateway.main]

  tags = {
    Name        = "${var.project_name}-${var.environment}-nat-eip"
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# NAT GATEWAY - Шлюз для выхода приватных ресурсов в интернет
# -----------------------------------------------------------------------------
# NAT Gateway позволяет ресурсам в приватных подсетях ходить в интернет,
# но при этом входящие соединения из интернета невозможны.
#
# Зачем это нужно? ECS контейнеры в приватных подсетях должны:
# - Скачивать Docker образы из ECR
# - Делать API запросы к внешним сервисам (OAuth, платёжные системы)
# - Скачивать пакеты (pip, npm)
#
# Как это работает:
# 1. Контейнер отправляет запрос на google.com
# 2. Запрос идёт через Route Table → NAT Gateway
# 3. NAT подменяет приватный IP контейнера на свой публичный EIP
# 4. Google отвечает на EIP, NAT перенаправляет ответ контейнеру
#
# ВАЖНО О СТОИМОСТИ:
# NAT Gateway - одна из самых дорогих частей инфраструктуры!
# - $32/месяц за сам NAT Gateway (почасовая оплата)
# - $0.045/GB за обработанный трафик
#
# Альтернативы для экономии:
# 1. NAT Instance (EC2 t3.micro) - ~$5/месяц, но менее надёжен
# 2. VPC Endpoints для AWS сервисов - ECR, S3, CloudWatch

resource "aws_nat_gateway" "main" {
  # Создаём только если переменная create_nat_gateway = true
  count = var.create_nat_gateway ? 1 : 0

  # Привязываем EIP к NAT Gateway
  allocation_id = aws_eip.nat[0].id

  # NAT Gateway размещается в ПУБЛИЧНОЙ подсети
  # Это логично - ему нужен доступ в интернет через IGW
  subnet_id = aws_subnet.public[0].id

  # Создаём после IGW, иначе NAT не сможет работать
  depends_on = [aws_internet_gateway.main]

  tags = {
    Name        = "${var.project_name}-${var.environment}-nat"
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# ROUTE TABLES - Таблицы маршрутизации
# -----------------------------------------------------------------------------
# Route Table определяет, куда направлять сетевой трафик.
# Каждая подсеть связана с одной Route Table.
#
# Правила маршрутизации:
# - destination: куда идёт трафик (CIDR блок)
# - target: через что направить (IGW, NAT, VPC Peering и т.д.)
#
# Пример: трафик на 8.8.8.8 (Google DNS) → destination 0.0.0.0/0 → IGW

# --- Публичная Route Table ---
# Для публичных подсетей: весь внешний трафик идёт через Internet Gateway

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  # Маршрут по умолчанию: весь интернет-трафик (0.0.0.0/0) → через IGW
  # 0.0.0.0/0 - это "любой IP адрес", т.е. весь интернет
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  # Локальный трафик внутри VPC (10.0.0.0/16) маршрутизируется автоматически
  # Его не нужно явно указывать - AWS добавляет этот маршрут сам

  tags = {
    Name        = "${var.project_name}-${var.environment}-public-rt"
    Project     = var.project_name
    Environment = var.environment
    Type        = "public"
    ManagedBy   = "terraform"
  }
}

# --- Приватная Route Table ---
# Для приватных подсетей: внешний трафик идёт через NAT Gateway (если создан)
# или вообще никуда не идёт (изолированная подсеть)

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  # Динамический блок: добавляем маршрут только если NAT Gateway создан
  # Если NAT не создан, подсети будут полностью изолированы от интернета
  dynamic "route" {
    # for_each перебирает список, если он не пустой
    for_each = var.create_nat_gateway ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = aws_nat_gateway.main[0].id
    }
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-private-rt"
    Project     = var.project_name
    Environment = var.environment
    Type        = "private"
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# ROUTE TABLE ASSOCIATIONS - Связь подсетей с Route Tables
# -----------------------------------------------------------------------------
# Каждую подсеть нужно явно связать с Route Table.
# Без этой связи подсеть использует Main Route Table VPC (не рекомендуется).

# Связываем публичные подсети с публичной Route Table
resource "aws_route_table_association" "public" {
  count = 2

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Связываем приватные подсети с приватной Route Table
resource "aws_route_table_association" "private" {
  count = 2

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# =============================================================================
# SECURITY GROUPS - Группы безопасности (виртуальные файрволы)
# =============================================================================
#
# Security Group (SG) - это stateful файрвол на уровне инстанса/контейнера.
# "Stateful" означает: если разрешён входящий трафик, ответ на него
# автоматически разрешён, и наоборот.
#
# Правила:
# - ingress (входящие) - кто может подключаться к ресурсу
# - egress (исходящие) - куда ресурс может подключаться
#
# Важный принцип: SG можно ссылаться друг на друга!
# Вместо "разрешить IP 10.0.1.5" можно "разрешить всем с SG sg-ecs".
# Это гораздо безопаснее и не ломается при смене IP.
# =============================================================================

# -----------------------------------------------------------------------------
# ALB Security Group - для Application Load Balancer
# -----------------------------------------------------------------------------
# ALB принимает трафик из интернета и распределяет его по контейнерам.
# Нужно разрешить входящий трафик на портах 80 (HTTP) и 443 (HTTPS).

resource "aws_security_group" "alb" {
  name        = "${var.project_name}-${var.environment}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  # Входящий HTTP трафик (порт 80) - для редиректа на HTTPS
  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    # 0.0.0.0/0 - разрешаем со всех IP адресов (весь интернет)
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Входящий HTTPS трафик (порт 443) - основной трафик
  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Исходящий трафик - ALB должен подключаться к ECS контейнерам
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    # "-1" означает все протоколы (TCP, UDP, ICMP и т.д.)
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-alb-sg"
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# ECS Security Group - для контейнеров приложения
# -----------------------------------------------------------------------------
# ECS контейнеры принимают трафик ТОЛЬКО от ALB (не напрямую из интернета).
# Это важный принцип безопасности - контейнеры изолированы от прямого доступа.

resource "aws_security_group" "ecs" {
  name        = "${var.project_name}-${var.environment}-ecs-sg"
  description = "Security group for ECS tasks"
  vpc_id      = aws_vpc.main.id

  # Входящий трафик на порт 3000 (Frontend/Next.js) - только от ALB
  ingress {
    description = "Frontend port from ALB"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    # Вместо IP указываем Security Group!
    # Это значит: разрешить трафик от любого ресурса с SG alb
    security_groups = [aws_security_group.alb.id]
  }

  # Входящий трафик на порт 8000 (Backend/Django) - только от ALB
  ingress {
    description = "Backend port from ALB"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Исходящий трафик - контейнеры должны ходить:
  # - В RDS (база данных)
  # - В Redis (кеш/сессии)
  # - В интернет через NAT (внешние API, скачивание пакетов)
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-ecs-sg"
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# RDS Security Group - для базы данных PostgreSQL
# -----------------------------------------------------------------------------
# База данных должна быть доступна ТОЛЬКО из ECS контейнеров.
# Никакого доступа из интернета или других источников!

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = aws_vpc.main.id

  # Входящий PostgreSQL трафик (порт 5432) - только от ECS
  ingress {
    description = "PostgreSQL from ECS"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    # Разрешаем подключения только от контейнеров
    security_groups = [aws_security_group.ecs.id]
  }

  # Исходящий трафик обычно не нужен для RDS
  # Но AWS требует хотя бы одно egress правило
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-rds-sg"
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# Redis Security Group - для ElastiCache Redis
# -----------------------------------------------------------------------------
# Redis используется для кеширования и хранения сессий.
# Доступ должен быть только из ECS контейнеров.

resource "aws_security_group" "redis" {
  name        = "${var.project_name}-${var.environment}-redis-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = aws_vpc.main.id

  # Входящий Redis трафик (порт 6379) - только от ECS
  ingress {
    description = "Redis from ECS"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-redis-sg"
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
