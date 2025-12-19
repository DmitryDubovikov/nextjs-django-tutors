package api

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"search/internal/opensearch"
)

func NewRouter(os opensearch.SearchClient, logger *slog.Logger, allowedOrigins string) http.Handler {
	r := chi.NewRouter()

	r.Use(RecoveryMiddleware(logger))
	r.Use(LoggingMiddleware(logger))
	r.Use(CORSMiddleware(allowedOrigins))

	handlers := NewHandlers(os, logger)

	r.Get("/health", handlers.Health)

	r.Put("/tutors/{id}", handlers.UpsertTutor)
	r.Delete("/tutors/{id}", handlers.DeleteTutor)
	r.Get("/tutors/search", handlers.SearchTutors)

	r.Post("/admin/sync", handlers.SyncTutors)
	r.Post("/admin/reindex", handlers.Reindex)

	return r
}
