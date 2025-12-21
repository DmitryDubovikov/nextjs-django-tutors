# Search Service

Go-based search service for the Tutors Marketplace, providing fast full-text search capabilities powered by OpenSearch.

## Overview

The Search Service is a high-performance microservice written in Go that handles tutor search functionality. It indexes tutor data from Django and provides a RESTful API for searching tutors with various filters.

**Key Features:**
- Full-text search across tutor name, headline, and bio
- Multi-language support (English stemming)
- Filtering by subjects, price range, rating, location, and format
- Real-time indexing via REST API
- Bulk synchronization from Django
- Kafka event consumption for real-time sync
- Health monitoring and graceful shutdown

## Architecture

```
services/search/
├── cmd/search/              # Application entry point
│   └── main.go             # Server initialization and startup
├── internal/
│   ├── api/                # HTTP handlers and routing
│   │   ├── handlers.go     # Request handlers
│   │   ├── middleware.go   # CORS, logging, recovery
│   │   └── router.go       # Route definitions
│   ├── domain/             # Domain models
│   │   └── tutor.go        # Tutor entity
│   ├── handler/            # Event handler (Phase 3)
│   │   └── handler.go      # Routes events to OpenSearch
│   ├── kafka/              # Kafka consumer
│   │   ├── consumer.go     # Kafka message consumer
│   │   ├── event.go        # Event structure
│   │   └── *_test.go       # Unit tests
│   └── opensearch/         # OpenSearch client
│       ├── client.go       # OpenSearch connection
│       ├── index.go        # Index management
│       ├── tutor.go        # Tutor search operations
│       └── interface.go    # SearchClient interface
├── Dockerfile              # Multi-stage Docker build
└── go.mod                  # Go dependencies
```

## API Endpoints

See [docs/api/search-api.md](/docs/api/search-api.md) for detailed API documentation.

**Public Endpoints:**
- `GET /health` - Health check
- `GET /tutors/search` - Search tutors
- `PUT /tutors/{id}` - Upsert single tutor
- `DELETE /tutors/{id}` - Delete tutor

**Admin Endpoints:**
- `POST /admin/sync` - Bulk sync tutors from Django
- `POST /admin/reindex` - Trigger reindex (informational)

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENSEARCH_URL` | `http://localhost:9200` | OpenSearch connection URL |
| `PORT` | `8080` | HTTP server port |
| `CORS_ALLOWED_ORIGINS` | `*` | CORS allowed origins (comma-separated) |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka broker addresses (comma-separated) |
| `KAFKA_TOPIC` | `tutor-events` | Kafka topic for tutor events |
| `KAFKA_GROUP_ID` | `search-service` | Consumer group ID |

## Development

### Running with Docker Compose

```bash
# Start all services
make up

# View logs
docker compose logs -f search-service

# Check health
curl http://localhost:8080/health
```

### Testing

```bash
# Run all tests
go test ./...

# With coverage
go test -cover ./...
```

### Building

```bash
# Docker build
docker compose build search-service

# Local build
CGO_ENABLED=0 go build -o bin/search ./cmd/search
```

## OpenSearch Index

The service creates a `tutors` index with:
- English analyzer for text fields
- Keyword fields for filtering
- Float fields for range queries

## Integration

### From Django

```bash
# Sync via admin action
# Select tutors > "Sync selected tutors to Search Service"

# Reindex all
docker compose exec backend python manage.py reindex_search
```

### From Frontend

```typescript
import { useSearch } from '@/hooks/use-search'

const { data } = useSearch({
  q: 'math',
  minRating: 4.5
})
```

## Kafka Integration

The service consumes events from Kafka (Redpanda) for real-time tutor updates.

### Event Processing Architecture

```
┌─────────────────┐
│  Kafka Consumer │
│  (consumer.go)  │
└────────┬────────┘
         │ reads messages
         ▼
┌─────────────────┐
│  Event struct   │
│  (event.go)     │
└────────┬────────┘
         │ unmarshals JSON
         ▼
┌─────────────────┐
│  EventHandler   │
│  (handler.go)   │
└────────┬────────┘
         │ routes by event_type
         ▼
    ┌────┴────┬─────────────┐
    ▼         ▼             ▼
┌────────┐ ┌───────┐  ┌────────┐
│ Create │ │Update │  │ Delete │
└───┬────┘ └───┬───┘  └───┬────┘
    └──────────┴──────────┘
               ▼
      ┌────────────────┐
      │   OpenSearch   │
      │  tutors index  │
      └────────────────┘
```

### Events Consumed

| Event | Action | Handler |
|-------|--------|---------|
| `TutorCreated` | Index new tutor | `handleTutorUpsert()` |
| `TutorUpdated` | Update existing tutor | `handleTutorUpsert()` |
| `TutorDeleted` | Remove from index | `handleTutorDelete()` |

See [docs/events/tutor-events.md](/docs/events/tutor-events.md) for event schema details.

### Error Handling

- Failed events are logged with full context
- Consumer continues processing next events
- All OpenSearch operations are idempotent (reprocessing is safe)

### Monitoring

```bash
# View consumer logs
docker compose logs -f search-service

# Check consumer group (via Redpanda Console)
open http://localhost:8084
```

## Dependencies

- `github.com/go-chi/chi/v5` - HTTP router
- `github.com/opensearch-project/opensearch-go/v4` - OpenSearch client
- `github.com/segmentio/kafka-go` - Kafka consumer
