# Tutors Marketplace

Demonstration pet-project — tutors services marketplace.

## Tech Stack

### Frontend
- Next.js 15.5.x (App Router, React Server Components)
- React 19.x
- TypeScript 5.x
- Tailwind CSS 4.1.x
- shadcn/ui + Radix UI
- TanStack Query 5.x + TanStack Table 8.x
- React Hook Form + Zod 4.x
- Zustand 5.x
- Motion 12.x

### Backend
- Django 5.2 LTS
- Django REST Framework 3.15.x
- drf-spectacular (OpenAPI 3.1)
- Django Channels (WebSockets)
- Celery 5.4.x
- Python 3.12+

### Infrastructure
- Docker Compose
- PostgreSQL 17 + pgvector
- Redis 7.4
- MinIO (S3-compatible)
- OpenSearch 2.x
- Unleash (feature flags)

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/yourusername/nextjs-django-tutors.git
cd nextjs-django-tutors
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Start all services:
```bash
docker compose up -d
```

4. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/
- API Docs: http://localhost:8000/api/docs/
- MinIO Console: http://localhost:9001
- Unleash: http://localhost:4242

## Development Commands

```bash
make help           # Show all available commands

# Docker
make up             # Start all services
make down           # Stop all services
make logs           # View logs (follow mode)
make build          # Rebuild containers

# Linting
make lint           # Run all linters
make lint-frontend  # Run Biome (frontend)
make lint-backend   # Run Ruff (backend)

# Testing
make test           # Run all tests
make test-frontend  # Run Vitest (frontend)
make test-backend   # Run pytest (backend)

# All checks
make check          # Run lint + test

# Database
make migrate        # Run Django migrations

# Shell access
make shell-frontend # Open shell in frontend container
make shell-backend  # Open shell in backend container
```

## Pre-commit Hooks

The project uses [Husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged) to automatically lint and format staged files before each commit.

### Setup

```bash
cd frontend && npm install
```

This runs `husky` via the `prepare` script and sets up Git hooks.

### What happens on commit

When you run `git commit`, the pre-commit hook automatically:

**Frontend** (via lint-staged):
- Runs `biome check --write` on staged `*.{js,jsx,ts,tsx,json,css,md}` files
- Auto-fixes formatting and linting issues

**Backend** (via Docker):
- Runs `ruff check` and `ruff format --check` on staged `*.py` files
- Requires Docker containers to be running (`make up`)

### Bypass (not recommended)

```bash
git commit --no-verify -m "message"
```

## Environment Variables

See [.env.example](.env.example) for all available variables.

## License

MIT License - see [LICENSE](LICENSE) for details.
