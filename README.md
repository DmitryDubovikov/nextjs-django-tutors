# Tutors Marketplace

A modern tutors services marketplace built with Next.js 15 and Django 5.2, demonstrating best practices in full-stack development with TypeScript, React Server Components, and REST APIs.

## Project Overview

Tutors Marketplace is a demonstration project showcasing a production-ready application architecture for a tutors booking platform. The project implements a clean separation between frontend and backend, with type-safe API communication, modern UI components, and comprehensive development tooling.

## Tech Stack

### Frontend
- **Next.js** 15.1.0 - React framework with App Router and Server Components
- **React** 19.0.0 - UI library
- **TypeScript** 5.7.2 - Type-safe JavaScript
- **Tailwind CSS** 4.0.0 - CSS-first configuration with custom design tokens
- **TanStack Query** 5.90.12 - Server state management
- **Orval** 7.3.0 - OpenAPI to TypeScript generator
- **Biome** 1.9.4 - Fast linter and formatter
- **Vitest** 2.1.8 - Unit testing framework

### Backend
- **Django** 5.2 LTS - Python web framework
- **Django REST Framework** 3.15.x - RESTful API toolkit
- **drf-spectacular** - OpenAPI 3.1 schema generation
- **Python** 3.12+ - Programming language
- **Ruff** - Fast Python linter and formatter
- **PostgreSQL** 17 - Primary database

### Infrastructure
- **Docker Compose** - Container orchestration
- **PostgreSQL** 17 (Alpine) - Relational database
- **Redis** 7.4 (Alpine) - Caching layer
- **MinIO** - S3-compatible object storage

### Development Tools
- **Husky** 9.1.7 - Git hooks
- **lint-staged** 15.2.10 - Pre-commit file linting
- **Faker** - Test data generation

## Getting Started

### Prerequisites

- Docker and Docker Compose installed
- Git for version control
- (Optional) Node.js 20+ for local frontend development
- (Optional) Python 3.12+ for local backend development

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nextjs-django-tutors
```

2. Start all services with Docker Compose:
```bash
make up
# or
docker compose up -d
```

3. Wait for services to be healthy (check with `docker compose ps`)

4. Run database migrations:
```bash
make migrate
# or
docker compose exec backend python manage.py migrate
```

5. Seed the database with test data:
```bash
docker compose exec backend python manage.py seed --count 20
```

### Running the Project

After installation, the following services will be available:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/
- **API Documentation**: http://localhost:8000/api/docs/
- **API Schema**: http://localhost:8000/api/schema/
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **PostgreSQL**: localhost:5432 (tutors/secret)
- **Redis**: localhost:6379

To view logs:
```bash
make logs
# or
docker compose logs -f
```

To stop all services:
```bash
make down
# or
docker compose down
```

## Project Structure

```
nextjs-django-tutors/
├── frontend/               # Next.js frontend application
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   │   ├── tutors/    # Tutors listing page
│   │   │   └── globals.css # Tailwind CSS-first config
│   │   ├── components/
│   │   │   ├── features/  # Feature components (TutorCard)
│   │   │   └── ui/        # Base UI components (shadcn-style)
│   │   ├── lib/
│   │   │   ├── api/       # Manual API client functions
│   │   │   └── api-client.ts # Custom fetch for orval
│   │   └── generated/     # Auto-generated from OpenAPI
│   │       ├── api/       # TanStack Query hooks
│   │       └── schemas/   # TypeScript types
│   ├── orval.config.ts    # API generation config
│   ├── package.json
│   └── .husky/            # Git hooks
│
├── backend/               # Django backend application
│   ├── apps/
│   │   ├── core/          # Core app with custom User model
│   │   │   └── models.py  # User (AbstractUser + user_type)
│   │   └── tutors/        # Tutors app
│   │       ├── models.py  # Tutor model
│   │       ├── serializers.py # DRF serializers
│   │       ├── views.py   # ReadOnlyModelViewSet
│   │       ├── urls.py    # Router configuration
│   │       └── management/
│   │           └── commands/
│   │               └── seed.py # Test data seeding
│   ├── config/
│   │   ├── settings.py    # Django settings
│   │   └── urls.py        # URL configuration
│   ├── pyproject.toml     # Python project config (Ruff, pytest)
│   └── manage.py
│
├── docker/                # Docker configurations
│   ├── frontend/
│   │   └── Dockerfile
│   └── backend/
│       └── Dockerfile
│
├── docker-compose.yml     # Docker Compose services
├── Makefile              # Development commands
└── README.md             # This file
```

## API Documentation

### Base URL
```
http://localhost:8000/api/
```

### Available Endpoints

#### List Tutors
```
GET /api/tutors/
```

Returns a paginated list of all tutors.

**Query Parameters:**
- `page` (integer, optional): Page number for pagination

**Response (200 OK):**
```json
{
  "count": 20,
  "next": "http://localhost:8000/api/tutors/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "full_name": "John Doe",
      "avatar_url": "https://i.pravatar.cc/300?u=john.doe.0",
      "headline": "Experienced Math tutor with 10 years of teaching",
      "bio": "I have been teaching Math for 10 years...",
      "hourly_rate": "75.00",
      "subjects": ["math", "physics"],
      "is_verified": true,
      "created_at": "2025-12-12T10:30:00Z"
    }
  ]
}
```

#### Get Tutor Details
```
GET /api/tutors/{id}/
```

Returns detailed information about a specific tutor.

**Path Parameters:**
- `id` (integer, required): Tutor ID

**Response (200 OK):**
```json
{
  "id": 1,
  "full_name": "John Doe",
  "avatar_url": "https://i.pravatar.cc/300?u=john.doe.0",
  "headline": "Experienced Math tutor with 10 years of teaching",
  "bio": "I have been teaching Math for 10 years...",
  "hourly_rate": "75.00",
  "subjects": ["math", "physics"],
  "is_verified": true,
  "email": "john.doe.0@example.com",
  "created_at": "2025-12-12T10:30:00Z",
  "updated_at": "2025-12-12T10:30:00Z"
}
```

### Interactive Documentation

Visit http://localhost:8000/api/docs/ for Swagger UI with interactive API documentation.

## Development

### Code Quality Tools

The project uses automated linting and formatting:

**Frontend (Biome):**
- Linter and formatter for JavaScript, TypeScript, JSON, CSS, Markdown
- Configuration in `frontend/biome.json`

**Backend (Ruff):**
- Fast Python linter and formatter
- Configuration in `backend/pyproject.toml`

### Running Linters

```bash
# Lint everything
make lint

# Lint frontend only
make lint-frontend

# Lint backend only
make lint-backend
```

### Running Tests

```bash
# Run all tests
make test

# Run frontend tests (Vitest)
make test-frontend

# Run backend tests (pytest)
make test-backend
```

### Running All Checks

```bash
make check
```

This runs both linting and tests for frontend and backend.

### Type Generation

The frontend uses Orval to generate TypeScript types and TanStack Query hooks from the OpenAPI schema.

**Generate types from running backend:**
```bash
cd frontend
npm run generate:api
```

**Check if generated files are up to date:**
```bash
npm run generate:api:check
```

Generated files are located in:
- `frontend/src/generated/api/` - TanStack Query hooks
- `frontend/src/generated/schemas/` - TypeScript type definitions

### Database Management

**Run migrations:**
```bash
make migrate
# or
docker compose exec backend python manage.py migrate
```

**Create migrations after model changes:**
```bash
docker compose exec backend python manage.py makemigrations
```

**Seed database with test data:**
```bash
docker compose exec backend python manage.py seed --count 20
```

**Clear existing data and seed:**
```bash
docker compose exec backend python manage.py seed --count 20 --clear
```

### Pre-commit Hooks

The project uses Husky and lint-staged for automatic code quality checks before commits.

**Setup (automatic on npm install):**
```bash
cd frontend
npm install
```

**What runs on commit:**
- Frontend: Biome check and format on staged JS/TS/JSON/CSS/MD files
- Backend: Ruff check and format on staged Python files (requires Docker)

**Bypass hooks (not recommended):**
```bash
git commit --no-verify -m "message"
```

### Shell Access

Open a shell in the containers for debugging:

```bash
# Frontend container
make shell-frontend

# Backend container
make shell-backend
```

### Available Make Commands

```bash
make help              # Show all available commands
make up                # Start all services
make down              # Stop all services
make logs              # View logs (follow mode)
make build             # Rebuild containers
make lint              # Run all linters
make lint-frontend     # Run Biome (frontend)
make lint-backend      # Run Ruff (backend)
make test              # Run all tests
make test-frontend     # Run Vitest (frontend)
make test-backend      # Run pytest (backend)
make check             # Run lint + test
make migrate           # Run Django migrations
make shell-frontend    # Open shell in frontend container
make shell-backend     # Open shell in backend container
```

## Database Schema

### User Model (apps.core.User)
Custom user model extending Django's AbstractUser.

**Fields:**
- Standard AbstractUser fields (username, email, password, etc.)
- `user_type` (string): "student" or "tutor"
- `avatar` (URL): User avatar URL
- `phone` (string): Phone number

### Tutor Model (apps.tutors.Tutor)
Tutor profile with OneToOne relationship to User.

**Fields:**
- `user` (OneToOne → User): Linked user account
- `headline` (string, max 200): Short tagline
- `bio` (text): Detailed description
- `hourly_rate` (decimal): Price per hour
- `subjects` (JSON): List of subjects taught
- `is_verified` (boolean): Verification status
- `created_at` (datetime): Creation timestamp
- `updated_at` (datetime): Last update timestamp

## Tailwind CSS Configuration

The project uses Tailwind CSS v4 with CSS-first configuration.

Configuration is in `frontend/src/app/globals.css` using the `@theme` directive with custom design tokens:

- Color system based on OKLCH color space
- Custom semantic colors (primary, success, warning, error)
- Design tokens for shadows, border radius, motion, typography
- CSS custom properties for easy theming

## Environment Variables

Key environment variables (see `.env.example` for full list):

**Frontend:**
- `NEXT_PUBLIC_API_URL`: Backend API base URL (default: http://localhost:8000/api)

**Backend:**
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `DJANGO_SECRET_KEY`: Django secret key
- `DJANGO_DEBUG`: Debug mode (true/false)
- `DJANGO_ALLOWED_HOSTS`: Comma-separated allowed hosts
- `CORS_ALLOWED_ORIGINS`: Comma-separated CORS origins

## License

MIT License - see LICENSE file for details.
