package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"search/internal/domain"
	"search/internal/opensearch"
)

type mockSearchClient struct {
	pingErr       error
	upsertErr     error
	deleteErr     error
	searchResult  *opensearch.SearchResponse
	searchErr     error
	upsertedTutor *domain.Tutor
	deletedID     int64
}

func (m *mockSearchClient) Ping(ctx context.Context) error {
	return m.pingErr
}

func (m *mockSearchClient) EnsureIndex(ctx context.Context) error {
	return nil
}

func (m *mockSearchClient) UpsertTutor(ctx context.Context, tutor *domain.Tutor) error {
	if m.upsertErr != nil {
		return m.upsertErr
	}
	m.upsertedTutor = tutor
	return nil
}

func (m *mockSearchClient) DeleteTutor(ctx context.Context, id int64) error {
	if m.deleteErr != nil {
		return m.deleteErr
	}
	m.deletedID = id
	return nil
}

func (m *mockSearchClient) SearchTutors(ctx context.Context, query opensearch.SearchQuery) (*opensearch.SearchResponse, error) {
	if m.searchErr != nil {
		return nil, m.searchErr
	}
	return m.searchResult, nil
}

func TestHealth_Healthy(t *testing.T) {
	mock := &mockSearchClient{}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	handlers := NewHandlers(mock, logger)

	req := httptest.NewRequest("GET", "/health", nil)
	rec := httptest.NewRecorder()

	handlers.Health(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var response map[string]string
	json.Unmarshal(rec.Body.Bytes(), &response)

	if response["status"] != "ok" {
		t.Errorf("expected status 'ok', got %s", response["status"])
	}
}

func TestHealth_Unhealthy(t *testing.T) {
	mock := &mockSearchClient{pingErr: errors.New("connection error")}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	handlers := NewHandlers(mock, logger)

	req := httptest.NewRequest("GET", "/health", nil)
	rec := httptest.NewRecorder()

	handlers.Health(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Errorf("expected status %d, got %d", http.StatusServiceUnavailable, rec.Code)
	}
}

func TestUpsertTutor_Success(t *testing.T) {
	mock := &mockSearchClient{}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	handlers := NewHandlers(mock, logger)

	tutor := domain.Tutor{
		FullName: "Test Tutor",
		Headline: "Test Headline",
		Rating:   4.5,
	}

	body, _ := json.Marshal(tutor)
	req := httptest.NewRequest("PUT", "/tutors/123", bytes.NewReader(body))
	req.SetPathValue("id", "123")
	rec := httptest.NewRecorder()

	handlers.UpsertTutor(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rec.Code)
	}
	if mock.upsertedTutor.ID != 123 {
		t.Errorf("expected ID 123, got %d", mock.upsertedTutor.ID)
	}
}

func TestUpsertTutor_InvalidID(t *testing.T) {
	mock := &mockSearchClient{}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	handlers := NewHandlers(mock, logger)

	req := httptest.NewRequest("PUT", "/tutors/invalid", nil)
	req.SetPathValue("id", "invalid")
	rec := httptest.NewRecorder()

	handlers.UpsertTutor(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}
}

func TestUpsertTutor_InvalidBody(t *testing.T) {
	mock := &mockSearchClient{}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	handlers := NewHandlers(mock, logger)

	req := httptest.NewRequest("PUT", "/tutors/123", bytes.NewReader([]byte("invalid json")))
	req.SetPathValue("id", "123")
	rec := httptest.NewRecorder()

	handlers.UpsertTutor(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}
}

func TestDeleteTutor_Success(t *testing.T) {
	mock := &mockSearchClient{}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	handlers := NewHandlers(mock, logger)

	req := httptest.NewRequest("DELETE", "/tutors/456", nil)
	req.SetPathValue("id", "456")
	rec := httptest.NewRecorder()

	handlers.DeleteTutor(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rec.Code)
	}
	if mock.deletedID != 456 {
		t.Errorf("expected deleted ID 456, got %d", mock.deletedID)
	}
}

func TestDeleteTutor_InvalidID(t *testing.T) {
	mock := &mockSearchClient{}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	handlers := NewHandlers(mock, logger)

	req := httptest.NewRequest("DELETE", "/tutors/invalid", nil)
	req.SetPathValue("id", "invalid")
	rec := httptest.NewRecorder()

	handlers.DeleteTutor(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}
}

func TestSearchTutors_Success(t *testing.T) {
	mock := &mockSearchClient{
		searchResult: &opensearch.SearchResponse{
			Results: []domain.Tutor{
				{ID: 1, FullName: "Tutor 1"},
				{ID: 2, FullName: "Tutor 2"},
			},
			Total: 2,
		},
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	handlers := NewHandlers(mock, logger)

	req := httptest.NewRequest("GET", "/tutors/search?q=test", nil)
	rec := httptest.NewRecorder()

	handlers.SearchTutors(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var response opensearch.SearchResponse
	json.Unmarshal(rec.Body.Bytes(), &response)

	if len(response.Results) != 2 {
		t.Errorf("expected 2 results, got %d", len(response.Results))
	}
	if response.Total != 2 {
		t.Errorf("expected total 2, got %d", response.Total)
	}
}

func TestSearchTutors_Error(t *testing.T) {
	mock := &mockSearchClient{searchErr: errors.New("search error")}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	handlers := NewHandlers(mock, logger)

	req := httptest.NewRequest("GET", "/tutors/search", nil)
	rec := httptest.NewRecorder()

	handlers.SearchTutors(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("expected status %d, got %d", http.StatusInternalServerError, rec.Code)
	}
}

func TestSyncTutors_Success(t *testing.T) {
	mock := &mockSearchClient{}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	handlers := NewHandlers(mock, logger)

	tutors := []domain.Tutor{
		{ID: 1, FullName: "Tutor 1"},
		{ID: 2, FullName: "Tutor 2"},
	}

	body, _ := json.Marshal(tutors)
	req := httptest.NewRequest("POST", "/admin/sync", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	handlers.SyncTutors(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var response map[string]int
	json.Unmarshal(rec.Body.Bytes(), &response)

	if response["synced"] != 2 {
		t.Errorf("expected synced 2, got %d", response["synced"])
	}
}

func TestSyncTutors_InvalidBody(t *testing.T) {
	mock := &mockSearchClient{}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	handlers := NewHandlers(mock, logger)

	req := httptest.NewRequest("POST", "/admin/sync", bytes.NewReader([]byte("invalid")))
	rec := httptest.NewRecorder()

	handlers.SyncTutors(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}
}

func TestReindex(t *testing.T) {
	mock := &mockSearchClient{}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	handlers := NewHandlers(mock, logger)

	req := httptest.NewRequest("POST", "/admin/reindex", nil)
	rec := httptest.NewRecorder()

	handlers.Reindex(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Errorf("expected status %d, got %d", http.StatusAccepted, rec.Code)
	}
}

func TestParseSearchQuery(t *testing.T) {
	tests := []struct {
		name     string
		url      string
		checkFn  func(q opensearch.SearchQuery) bool
		checkMsg string
	}{
		{
			name: "text only",
			url:  "/search?q=математика",
			checkFn: func(q opensearch.SearchQuery) bool {
				return q.Text == "математика"
			},
			checkMsg: "text should be 'математика'",
		},
		{
			name: "subjects",
			url:  "/search?subjects=math&subjects=physics",
			checkFn: func(q opensearch.SearchQuery) bool {
				return len(q.Subjects) == 2 && q.Subjects[0] == "math"
			},
			checkMsg: "should have 2 subjects",
		},
		{
			name: "price range",
			url:  "/search?min_price=500&max_price=2000",
			checkFn: func(q opensearch.SearchQuery) bool {
				return q.MinPrice != nil && *q.MinPrice == 500 &&
					q.MaxPrice != nil && *q.MaxPrice == 2000
			},
			checkMsg: "should have price range",
		},
		{
			name: "format",
			url:  "/search?format=online",
			checkFn: func(q opensearch.SearchQuery) bool {
				return q.Format == "online"
			},
			checkMsg: "format should be 'online'",
		},
		{
			name: "pagination",
			url:  "/search?limit=50&offset=100",
			checkFn: func(q opensearch.SearchQuery) bool {
				return q.Limit == 50 && q.Offset == 100
			},
			checkMsg: "pagination should be limit=50, offset=100",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tt.url, nil)
			result := parseSearchQuery(req)

			if !tt.checkFn(result) {
				t.Error(tt.checkMsg)
			}
		})
	}
}

func TestRespondJSON(t *testing.T) {
	rec := httptest.NewRecorder()
	data := map[string]string{"key": "value"}

	respondJSON(rec, http.StatusOK, data)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rec.Code)
	}
	if rec.Header().Get("Content-Type") != "application/json" {
		t.Error("expected Content-Type application/json")
	}
}

func TestRespondError(t *testing.T) {
	rec := httptest.NewRecorder()

	respondError(rec, http.StatusBadRequest, "test error")

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
	}

	var result map[string]string
	json.Unmarshal(rec.Body.Bytes(), &result)

	if result["error"] != "test error" {
		t.Errorf("expected error 'test error', got %s", result["error"])
	}
}
