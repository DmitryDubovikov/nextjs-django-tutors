# Tutors Marketplace

**Full-stack marketplace (Next.js + Django)** demonstrating:
- clean architecture separation (frontend/backend)
- type-safe API (OpenAPI → generated TypeScript)
- Dockerized dev environment
- modern lint/test tooling

## Why This Project Matters

**What is it?**
A tutors booking platform where students find and book lessons with verified tutors.

**Problems it solves:**
- Tutor discovery with filters (subject, rate, verification status)
- Lesson booking and scheduling
- Real-time chat between tutors and students
- Admin dashboard for content management

**Skills demonstrated:**
- Full-stack TypeScript + Python development
- REST API design with OpenAPI 3.1 spec
- Type-safe frontend-backend integration (Orval)
- Docker containerization
- CI/CD and code quality practices

## Demo

> 🚧 **Coming soon** — Live demo link

<!-- TODO: Add screenshots when UI is finalized
![Tutors List](screenshots/tutors.png)
![Booking Flow](screenshots/booking.png)
-->

## Technical Highlights

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4, Zustand |
| Backend | Django 5.2 LTS, DRF, Django Channels, drf-spectacular |
| Database | PostgreSQL 17, Redis 7.4 |
| Real-time | WebSockets (Django Channels), Redis Channel Layer |
| Infra | Docker Compose, MinIO, Daphne ASGI |
| Quality | Biome, Ruff, Husky, Vitest, pytest |

## Quick Start

```bash
git clone <repo-url> && cd nextjs-django-tutors
make up
make migrate
docker compose exec backend python manage.py seed --count 20
make check  # Run linters + tests
```

Open http://localhost:3000 (frontend) or http://localhost:8000/api/docs/ (API).

→ See [GETTING_STARTED.md](GETTING_STARTED.md) for details.

## API

REST API with OpenAPI 3.1 schema. Interactive docs at `/api/docs/`.

→ See [API.md](API.md) for endpoints reference.

## License

MIT
