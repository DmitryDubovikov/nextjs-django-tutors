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

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js 15 application |
| Backend API | http://localhost:8000/api/ | Django REST API |
| API Docs (Swagger) | http://localhost:8000/api/docs/ | Interactive API docs |
| Search Service | http://localhost:8080 | Go search microservice |
| Unleash | http://localhost:4242 | Feature flags admin UI |
| MinIO Console | http://localhost:9001 | S3 storage (minioadmin/minioadmin) |
| Redpanda Console | http://localhost:8084 | Kafka message browser |
| OpenSearch | http://localhost:9200 | Full-text search engine |
| PostgreSQL | localhost:5432 | Database (tutors/secret) |
| Redis | localhost:6379 | Cache & Celery broker |

### Background Services (no UI)

| Service | Description |
|---------|-------------|
| Celery Worker | Executes async tasks (indexing, notifications) |
| Celery Beat | Scheduled/periodic tasks |
| Redpanda (Kafka) | Message broker on port 9092 |

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

## Background Tasks

Celery handles async task processing:

```bash
# View Celery logs
docker compose logs -f celery-worker celery-beat

# Run a task manually (from backend shell)
docker compose exec backend python manage.py shell
>>> from apps.events.tasks import sync_tutors_to_search
>>> sync_tutors_to_search.delay()
```

## Event-Driven Architecture

Events flow through Kafka (Redpanda):

1. Django publishes tutor events to Kafka topic `tutor-events`
2. Search Service (Go) consumes events
3. Tutors are indexed in OpenSearch

Monitor events at http://localhost:8084 (Redpanda Console)

```bash
# Check Kafka topics
docker compose exec redpanda rpk topic list

# Consume messages from a topic
docker compose exec redpanda rpk topic consume tutor-events
```

## Feature Flags (Unleash)

Unleash manages feature flags for A/B testing and gradual rollouts.

**Admin UI:** http://localhost:4242

**Default tokens (pre-configured):**
- Admin API: `*:*.unleash-admin-token`
- Client API: `default:development.unleash-client-token`

**Usage in backend (Python):**
```python
from UnleashClient import UnleashClient

client = UnleashClient(
    url="http://unleash:4242/api",
    app_name="tutors-backend",
    custom_headers={"Authorization": "default:development.unleash-client-token"}
)
client.initialize_client()

if client.is_enabled("new-search-ui"):
    # Show new search UI
    pass
```

**Creating a feature flag:**
1. Open http://localhost:4242
2. Create new flag (e.g., `new-tutor-card`)
3. Enable for specific environments or user segments
4. Use in code to conditionally enable features

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed. See the example file for all available options.

### Frontend Environment Variables

Next.js requires its own `.env.local` file in the `frontend/` directory for server-side variables:

```bash
# Create frontend/.env.local with required variables
cat > frontend/.env.local << 'EOF'
# Auth.js secret (generate with: openssl rand -base64 32)
AUTH_SECRET=<your-generated-secret>

# OAuth credentials (optional, for social login)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
EOF
```

Generate `AUTH_SECRET`:
```bash
openssl rand -base64 32
```

> **Note**: `NEXT_PUBLIC_*` variables are read from the root `.env` file. Server-side variables like `AUTH_SECRET` must be in `frontend/.env.local`.
