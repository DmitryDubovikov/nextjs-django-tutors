.PHONY: help up down logs lint lint-frontend lint-backend test test-frontend test-backend check migrate shell-frontend shell-backend

# Default target
help:
	@echo "Available commands:"
	@echo ""
	@echo "  Docker:"
	@echo "    make up              - Start all services"
	@echo "    make down            - Stop all services"
	@echo "    make logs            - View logs (follow mode)"
	@echo "    make build           - Rebuild containers"
	@echo ""
	@echo "  Linting:"
	@echo "    make lint            - Run all linters"
	@echo "    make lint-frontend   - Run frontend linter (Biome)"
	@echo "    make lint-backend    - Run backend linter (Ruff)"
	@echo ""
	@echo "  Testing:"
	@echo "    make test            - Run all tests"
	@echo "    make test-frontend   - Run frontend tests (Vitest)"
	@echo "    make test-backend    - Run backend tests (pytest)"
	@echo ""
	@echo "  All checks:"
	@echo "    make check           - Run lint + test (all)"
	@echo ""
	@echo "  Database:"
	@echo "    make migrate         - Run Django migrations"
	@echo ""
	@echo "  Shell access:"
	@echo "    make shell-frontend  - Open shell in frontend container"
	@echo "    make shell-backend   - Open shell in backend container"

# =============================================================================
# Docker commands
# =============================================================================

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

build:
	docker compose build

# =============================================================================
# Linting
# =============================================================================

lint: lint-frontend lint-backend
	@echo "✅ All linters passed!"

lint-frontend:
	@echo "🔍 Running frontend linter (Biome)..."
	docker compose exec frontend npm run lint

lint-backend:
	@echo "🔍 Running backend linter (Ruff)..."
	docker compose exec backend ruff check .

# =============================================================================
# Testing
# =============================================================================

test: test-frontend test-backend
	@echo "✅ All tests passed!"

test-frontend:
	@echo "🧪 Running frontend tests (Vitest)..."
	docker compose exec frontend npm test

test-backend:
	@echo "🧪 Running backend tests (pytest)..."
	docker compose exec backend pytest -v

# =============================================================================
# All checks (lint + test)
# =============================================================================

check: lint test
	@echo ""
	@echo "=========================================="
	@echo "✅ All checks passed!"
	@echo "=========================================="

# =============================================================================
# Database
# =============================================================================

migrate:
	docker compose exec backend python manage.py migrate

# =============================================================================
# Shell access
# =============================================================================

shell-frontend:
	docker compose exec frontend sh

shell-backend:
	docker compose exec backend bash
