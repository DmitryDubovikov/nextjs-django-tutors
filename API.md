# API Reference

Base URL: `http://localhost:8000/api/`

## Interactive Documentation

Swagger UI with full API documentation is available at:
- http://localhost:8000/api/docs/

OpenAPI schema (JSON):
- http://localhost:8000/api/schema/

## Endpoints

### Tutors

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tutors/` | List all tutors (paginated) |
| GET | `/tutors/{id}/` | Get tutor details |

**Example response (list):**
```json
{
  "count": 20,
  "next": "http://localhost:8000/api/tutors/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "full_name": "John Doe",
      "avatar_url": "https://i.pravatar.cc/300?u=1",
      "headline": "Experienced Math tutor",
      "hourly_rate": "75.00",
      "subjects": ["math", "physics"],
      "is_verified": true
    }
  ]
}
```

### Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/bookings/` | List user bookings |
| POST | `/bookings/` | Create a booking |
| GET | `/bookings/{id}/` | Get booking details |
| PATCH | `/bookings/{id}/` | Update booking |
| DELETE | `/bookings/{id}/` | Cancel booking |

## Type Safety

TypeScript types and TanStack Query hooks are auto-generated from the OpenAPI schema:

```bash
make generate-api
```

Generated files location:
- `frontend/src/generated/api/` — Query hooks
- `frontend/src/generated/schemas/` — TypeScript types

Usage example:
```tsx
import { useGetTutorsList } from "@/generated/api/tutors";

const { data, isLoading } = useGetTutorsList();
```
