.PHONY: help up down logs lint lint-frontend lint-backend test test-frontend test-backend check generate-schema generate-api migrate shell-frontend shell-backend format format-frontend format-backend

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
	@echo "  Formatting:"
	@echo "    make format          - Format all code"
	@echo "    make format-frontend - Format frontend code (Biome)"
	@echo "    make format-backend  - Format backend code (Ruff)"
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
	@echo "  Code generation:"
	@echo "    make generate-schema - Export OpenAPI schema from backend"
	@echo "    make generate-api    - Generate TypeScript types from schema"
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
# Formatting
# =============================================================================

format: format-frontend format-backend
	@echo "✅ All code formatted!"

format-frontend:
	@echo "🎨 Formatting frontend code (Biome)..."
	docker compose exec frontend npm run format

format-backend:
	@echo "🎨 Formatting backend code (Ruff)..."
	docker compose exec backend ruff format .

# =============================================================================
# Linting
# =============================================================================

lint: lint-frontend lint-backend
	@echo "✅ All linters passed!"

lint-frontend:
	@echo "🔍 Running frontend linter (Biome)..."
	docker compose exec frontend npm run lint
	docker compose exec frontend npm run format:check
	@echo "🔍 Running TypeScript check..."
	docker compose exec frontend npm run typecheck
	@echo "🔍 Checking API types are up to date..."
	cd frontend && npm run generate:api:check

lint-backend:
	@echo "🔍 Running backend linter (Ruff)..."
	docker compose exec backend ruff check .
	docker compose exec backend ruff format --check .

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
	@echo ""
	@echo "  Frontend:"
	@echo "    ✓ Biome lint"
	@echo "    ✓ Biome format"
	@echo "    ✓ TypeScript check"
	@echo "    ✓ API types up to date"
	@echo "    ✓ Vitest tests"
	@echo ""
	@echo "  Backend:"
	@echo "    ✓ Ruff lint"
	@echo "    ✓ Ruff format"
	@echo "    ✓ pytest tests"
	@echo ""

# =============================================================================
# Code generation
# =============================================================================

generate-schema:
	@echo "📝 Generating OpenAPI schema..."
	docker compose exec backend python manage.py spectacular --file /app/schema.json --format openapi-json
	docker compose cp backend:/app/schema.json frontend/src/generated/schema.json
	@echo "✅ Schema exported to frontend/src/generated/schema.json"

generate-api: generate-schema
	@echo "🔧 Generating TypeScript types from schema..."
	docker compose exec frontend npm run generate:api
	@echo "✅ API types generated!"

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
