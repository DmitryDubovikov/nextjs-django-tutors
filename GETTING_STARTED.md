# Getting Started

## Prerequisites

- Docker and Docker Compose
- Git
- (Optional) Node.js 20+ for local frontend development
- (Optional) Python 3.12+ for local backend development

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd nextjs-django-tutors

# Start all services
make up

# Run database migrations
make migrate

# Seed with test data
docker compose exec backend python manage.py seed --count 20
```

## Services

After installation, the following services will be available:

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | — |
| Backend API | http://localhost:8000/api/ | — |
| API Docs (Swagger) | http://localhost:8000/api/docs/ | — |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| PostgreSQL | localhost:5432 | tutors / secret |
| Redis | localhost:6379 | — |

## Common Commands

```bash
make up              # Start all services
make down            # Stop all services
make logs            # View logs (follow mode)
make build           # Rebuild containers

make lint            # Run all linters
make test            # Run all tests
make check           # Run lint + test

make migrate         # Run Django migrations
make generate-api    # Regenerate TypeScript types from OpenAPI schema

make shell-frontend  # Open shell in frontend container
make shell-backend   # Open shell in backend container
```

Run `make help` for the full list of available commands.

## Type Generation

When you modify Django models, serializers, or API endpoints, regenerate TypeScript types:

```bash
make generate-api
```

This exports the OpenAPI schema from backend and generates TypeScript types + TanStack Query hooks via Orval.

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed. See the example file for all available options.
