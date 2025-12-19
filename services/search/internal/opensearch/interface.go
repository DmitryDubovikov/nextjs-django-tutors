package opensearch

import (
	"context"

	"search/internal/domain"
)

type SearchClient interface {
	Ping(ctx context.Context) error
	EnsureIndex(ctx context.Context) error
	UpsertTutor(ctx context.Context, tutor *domain.Tutor) error
	DeleteTutor(ctx context.Context, id int64) error
	SearchTutors(ctx context.Context, query SearchQuery) (*SearchResponse, error)
}
