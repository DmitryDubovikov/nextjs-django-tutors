package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"search/internal/domain"
	"search/internal/opensearch"
)

type Handlers struct {
	os     opensearch.SearchClient
	logger *slog.Logger
}

func NewHandlers(os opensearch.SearchClient, logger *slog.Logger) *Handlers {
	return &Handlers{
		os:     os,
		logger: logger,
	}
}

func (h *Handlers) Health(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	err := h.os.Ping(ctx)
	if err != nil {
		h.logger.Error("OpenSearch ping failed", "error", err)
		respondJSON(w, http.StatusServiceUnavailable, map[string]string{
			"status":     "unhealthy",
			"opensearch": "disconnected",
			"error":      err.Error(),
		})
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{
		"status":     "ok",
		"opensearch": "connected",
	})
}

func (h *Handlers) UpsertTutor(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	idStr := r.PathValue("id")

	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid tutor ID")
		return
	}

	var tutor domain.Tutor
	if err := json.NewDecoder(r.Body).Decode(&tutor); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	tutor.ID = id

	if err := h.os.UpsertTutor(ctx, &tutor); err != nil {
		h.logger.Error("Failed to upsert tutor", "id", id, "error", err)
		respondError(w, http.StatusInternalServerError, "Failed to index tutor")
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"status":   "indexed",
		"tutor_id": id,
	})
}

func (h *Handlers) DeleteTutor(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	idStr := r.PathValue("id")

	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid tutor ID")
		return
	}

	if err := h.os.DeleteTutor(ctx, id); err != nil {
		h.logger.Error("Failed to delete tutor", "id", id, "error", err)
		respondError(w, http.StatusInternalServerError, "Failed to delete tutor")
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"status":   "deleted",
		"tutor_id": id,
	})
}

func (h *Handlers) SearchTutors(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	query := parseSearchQuery(r)

	result, err := h.os.SearchTutors(ctx, query)
	if err != nil {
		h.logger.Error("Failed to search tutors", "error", err)
		respondError(w, http.StatusInternalServerError, "Failed to search tutors")
		return
	}

	respondJSON(w, http.StatusOK, result)
}

func (h *Handlers) SyncTutors(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var tutors []domain.Tutor
	if err := json.NewDecoder(r.Body).Decode(&tutors); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	synced := 0
	for _, tutor := range tutors {
		if err := h.os.UpsertTutor(ctx, &tutor); err != nil {
			h.logger.Error("Failed to sync tutor", "id", tutor.ID, "error", err)
			continue
		}
		synced++
	}

	respondJSON(w, http.StatusOK, map[string]int{
		"synced": synced,
		"total":  len(tutors),
	})
}

func (h *Handlers) Reindex(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusAccepted, map[string]string{
		"status":  "accepted",
		"message": "Use /admin/sync with tutor data from Django",
	})
}

func parseSearchQuery(r *http.Request) opensearch.SearchQuery {
	q := r.URL.Query()

	query := opensearch.SearchQuery{
		Text:     q.Get("q"),
		Format:   q.Get("format"),
		Location: q.Get("location"),
	}

	if subjects := q["subjects"]; len(subjects) > 0 {
		query.Subjects = subjects
	}

	if minPrice := q.Get("min_price"); minPrice != "" {
		if v, err := strconv.ParseFloat(minPrice, 64); err == nil {
			query.MinPrice = &v
		}
	}

	if maxPrice := q.Get("max_price"); maxPrice != "" {
		if v, err := strconv.ParseFloat(maxPrice, 64); err == nil {
			query.MaxPrice = &v
		}
	}

	if minRating := q.Get("min_rating"); minRating != "" {
		if v, err := strconv.ParseFloat(minRating, 64); err == nil {
			query.MinRating = &v
		}
	}

	if limit := q.Get("limit"); limit != "" {
		if v, err := strconv.Atoi(limit); err == nil {
			query.Limit = v
		}
	}

	if offset := q.Get("offset"); offset != "" {
		if v, err := strconv.Atoi(offset); err == nil {
			query.Offset = v
		}
	}

	return query
}

func respondJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}
