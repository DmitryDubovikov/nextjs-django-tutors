package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"testing"
	"time"

	"search/internal/domain"
	"search/internal/kafka"
	"search/internal/opensearch"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockSearchClient is a mock implementation of opensearch.SearchClient for testing.
type mockSearchClient struct {
	upsertFunc func(ctx context.Context, tutor *domain.Tutor) error
	deleteFunc func(ctx context.Context, id int64) error
}

func (m *mockSearchClient) Ping(ctx context.Context) error {
	return nil
}

func (m *mockSearchClient) EnsureIndex(ctx context.Context) error {
	return nil
}

func (m *mockSearchClient) UpsertTutor(ctx context.Context, tutor *domain.Tutor) error {
	if m.upsertFunc != nil {
		return m.upsertFunc(ctx, tutor)
	}
	return nil
}

func (m *mockSearchClient) DeleteTutor(ctx context.Context, id int64) error {
	if m.deleteFunc != nil {
		return m.deleteFunc(ctx, id)
	}
	return nil
}

func (m *mockSearchClient) SearchTutors(ctx context.Context, query opensearch.SearchQuery) (*opensearch.SearchResponse, error) {
	return &opensearch.SearchResponse{Results: []domain.Tutor{}, Total: 0}, nil
}

// Helper function to create a test logger that discards output.
func newTestLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(nil, &slog.HandlerOptions{
		Level: slog.LevelError, // Only log errors to keep test output clean
	}))
}

func TestNew(t *testing.T) {
	t.Parallel()

	mockOS := &mockSearchClient{}
	logger := newTestLogger()

	handler := New(mockOS, logger)

	assert.NotNil(t, handler)
	assert.Equal(t, mockOS, handler.os)
	assert.Equal(t, logger, handler.logger)
}

func TestEventHandler_Handle_TutorCreated(t *testing.T) {
	t.Parallel()

	var capturedTutor *domain.Tutor
	mockOS := &mockSearchClient{
		upsertFunc: func(ctx context.Context, tutor *domain.Tutor) error {
			capturedTutor = tutor
			return nil
		},
	}

	handler := New(mockOS, newTestLogger())

	tutor := domain.Tutor{
		ID:           123,
		Slug:         "john-doe",
		FullName:     "John Doe",
		Headline:     "Math Tutor",
		Bio:          "Experienced math teacher",
		Subjects:     []string{"math", "algebra"},
		HourlyRate:   50.0,
		Rating:       4.5,
		ReviewsCount: 10,
		IsVerified:   true,
		Location:     "New York",
		Formats:      []string{"online", "in-person"},
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	payload, err := json.Marshal(tutor)
	require.NoError(t, err)

	event := kafka.Event{
		EventID:       "event-123",
		EventType:     "TutorCreated",
		AggregateType: "Tutor",
		AggregateID:   "123",
		Payload:       payload,
		CreatedAt:     time.Now().Format(time.RFC3339),
	}

	err = handler.Handle(context.Background(), event)

	assert.NoError(t, err)
	assert.NotNil(t, capturedTutor)
	assert.Equal(t, int64(123), capturedTutor.ID)
	assert.Equal(t, "John Doe", capturedTutor.FullName)
	assert.Equal(t, "Math Tutor", capturedTutor.Headline)
}

func TestEventHandler_Handle_TutorUpdated(t *testing.T) {
	t.Parallel()

	var capturedTutor *domain.Tutor
	mockOS := &mockSearchClient{
		upsertFunc: func(ctx context.Context, tutor *domain.Tutor) error {
			capturedTutor = tutor
			return nil
		},
	}

	handler := New(mockOS, newTestLogger())

	tutor := domain.Tutor{
		ID:           456,
		FullName:     "Jane Smith",
		Headline:     "Physics Tutor",
		Bio:          "PhD in Physics",
		Subjects:     []string{"physics"},
		HourlyRate:   75.0,
		Rating:       4.8,
		ReviewsCount: 25,
		IsVerified:   true,
	}

	payload, err := json.Marshal(tutor)
	require.NoError(t, err)

	event := kafka.Event{
		EventID:       "event-456",
		EventType:     "TutorUpdated",
		AggregateType: "Tutor",
		AggregateID:   "456",
		Payload:       payload,
		CreatedAt:     time.Now().Format(time.RFC3339),
	}

	err = handler.Handle(context.Background(), event)

	assert.NoError(t, err)
	assert.NotNil(t, capturedTutor)
	assert.Equal(t, int64(456), capturedTutor.ID)
	assert.Equal(t, "Jane Smith", capturedTutor.FullName)
	assert.Equal(t, 4.8, capturedTutor.Rating)
}

func TestEventHandler_Handle_TutorDeleted(t *testing.T) {
	t.Parallel()

	var deletedID int64
	mockOS := &mockSearchClient{
		deleteFunc: func(ctx context.Context, id int64) error {
			deletedID = id
			return nil
		},
	}

	handler := New(mockOS, newTestLogger())

	payload, err := json.Marshal(map[string]int64{"id": 789})
	require.NoError(t, err)

	event := kafka.Event{
		EventID:       "event-789",
		EventType:     "TutorDeleted",
		AggregateType: "Tutor",
		AggregateID:   "789",
		Payload:       payload,
		CreatedAt:     time.Now().Format(time.RFC3339),
	}

	err = handler.Handle(context.Background(), event)

	assert.NoError(t, err)
	assert.Equal(t, int64(789), deletedID)
}

func TestEventHandler_Handle_UnknownEventType(t *testing.T) {
	t.Parallel()

	upsertCalled := false
	deleteCalled := false

	mockOS := &mockSearchClient{
		upsertFunc: func(ctx context.Context, tutor *domain.Tutor) error {
			upsertCalled = true
			return nil
		},
		deleteFunc: func(ctx context.Context, id int64) error {
			deleteCalled = true
			return nil
		},
	}

	handler := New(mockOS, newTestLogger())

	event := kafka.Event{
		EventID:       "event-999",
		EventType:     "TutorArchived", // Unknown event type
		AggregateType: "Tutor",
		AggregateID:   "999",
		Payload:       json.RawMessage(`{}`),
		CreatedAt:     time.Now().Format(time.RFC3339),
	}

	err := handler.Handle(context.Background(), event)

	assert.NoError(t, err) // Should not error on unknown event
	assert.False(t, upsertCalled)
	assert.False(t, deleteCalled)
}

func TestEventHandler_Handle_TableDriven(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name         string
		eventType    string
		payload      interface{}
		expectUpsert bool
		expectDelete bool
		shouldError  bool
		errorMsg     string
	}{
		{
			name:      "TutorCreated success",
			eventType: "TutorCreated",
			payload: domain.Tutor{
				ID:       1,
				FullName: "Test User",
			},
			expectUpsert: true,
			expectDelete: false,
			shouldError:  false,
		},
		{
			name:      "TutorUpdated success",
			eventType: "TutorUpdated",
			payload: domain.Tutor{
				ID:       2,
				FullName: "Updated User",
			},
			expectUpsert: true,
			expectDelete: false,
			shouldError:  false,
		},
		{
			name:      "TutorDeleted success",
			eventType: "TutorDeleted",
			payload: map[string]int64{
				"id": 3,
			},
			expectUpsert: false,
			expectDelete: true,
			shouldError:  false,
		},
		{
			name:         "Unknown event type",
			eventType:    "TutorSuspended",
			payload:      map[string]string{"test": "data"},
			expectUpsert: false,
			expectDelete: false,
			shouldError:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			upsertCalled := false
			deleteCalled := false

			mockOS := &mockSearchClient{
				upsertFunc: func(ctx context.Context, tutor *domain.Tutor) error {
					upsertCalled = true
					return nil
				},
				deleteFunc: func(ctx context.Context, id int64) error {
					deleteCalled = true
					return nil
				},
			}

			handler := New(mockOS, newTestLogger())

			payload, err := json.Marshal(tt.payload)
			require.NoError(t, err)

			event := kafka.Event{
				EventID:       "event-test",
				EventType:     tt.eventType,
				AggregateType: "Tutor",
				AggregateID:   "123",
				Payload:       payload,
				CreatedAt:     time.Now().Format(time.RFC3339),
			}

			err = handler.Handle(context.Background(), event)

			if tt.shouldError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
			} else {
				assert.NoError(t, err)
			}

			assert.Equal(t, tt.expectUpsert, upsertCalled, "upsert called mismatch")
			assert.Equal(t, tt.expectDelete, deleteCalled, "delete called mismatch")
		})
	}
}

func TestEventHandler_HandleTutorUpsert_InvalidPayload(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		payload  string
		errorMsg string
	}{
		{
			name:     "Invalid JSON",
			payload:  `{invalid json`,
			errorMsg: "failed to unmarshal tutor payload",
		},
		{
			name:     "Empty JSON",
			payload:  ``,
			errorMsg: "failed to unmarshal tutor payload",
		},
		{
			name:     "Wrong type",
			payload:  `"just a string"`,
			errorMsg: "failed to unmarshal tutor payload",
		},
		{
			name:     "Missing required fields",
			payload:  `{"id": "not-a-number"}`,
			errorMsg: "failed to unmarshal tutor payload",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockOS := &mockSearchClient{}
			handler := New(mockOS, newTestLogger())

			event := kafka.Event{
				EventID:       "event-invalid",
				EventType:     "TutorCreated",
				AggregateType: "Tutor",
				AggregateID:   "123",
				Payload:       json.RawMessage(tt.payload),
				CreatedAt:     time.Now().Format(time.RFC3339),
			}

			err := handler.Handle(context.Background(), event)

			assert.Error(t, err)
			assert.Contains(t, err.Error(), tt.errorMsg)
		})
	}
}

func TestEventHandler_HandleTutorDelete_InvalidPayload(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		payload  string
		errorMsg string
	}{
		{
			name:     "Invalid JSON",
			payload:  `{invalid json`,
			errorMsg: "failed to unmarshal delete payload",
		},
		{
			name:     "Missing id field",
			payload:  `{}`,
			errorMsg: "invalid tutor ID in delete payload",
		},
		{
			name:     "Zero id",
			payload:  `{"id": 0}`,
			errorMsg: "invalid tutor ID in delete payload",
		},
		{
			name:     "Negative id",
			payload:  `{"id": -5}`,
			errorMsg: "invalid tutor ID in delete payload",
		},
		{
			name:     "Wrong id type",
			payload:  `{"id": "not-a-number"}`,
			errorMsg: "failed to unmarshal delete payload",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockOS := &mockSearchClient{
				deleteFunc: func(ctx context.Context, id int64) error {
					return nil
				},
			}
			handler := New(mockOS, newTestLogger())

			event := kafka.Event{
				EventID:       "event-invalid",
				EventType:     "TutorDeleted",
				AggregateType: "Tutor",
				AggregateID:   "123",
				Payload:       json.RawMessage(tt.payload),
				CreatedAt:     time.Now().Format(time.RFC3339),
			}

			err := handler.Handle(context.Background(), event)

			assert.Error(t, err)
			assert.Contains(t, err.Error(), tt.errorMsg)
		})
	}
}

func TestEventHandler_UpsertError_PropagatesError(t *testing.T) {
	t.Parallel()

	expectedErr := errors.New("opensearch connection failed")

	mockOS := &mockSearchClient{
		upsertFunc: func(ctx context.Context, tutor *domain.Tutor) error {
			return expectedErr
		},
	}

	handler := New(mockOS, newTestLogger())

	tutor := domain.Tutor{ID: 100, FullName: "Test"}
	payload, _ := json.Marshal(tutor)

	event := kafka.Event{
		EventID:       "event-err",
		EventType:     "TutorCreated",
		AggregateType: "Tutor",
		AggregateID:   "100",
		Payload:       payload,
		CreatedAt:     time.Now().Format(time.RFC3339),
	}

	err := handler.Handle(context.Background(), event)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to upsert tutor 100")
	assert.ErrorIs(t, err, expectedErr)
}

func TestEventHandler_DeleteError_PropagatesError(t *testing.T) {
	t.Parallel()

	expectedErr := errors.New("opensearch delete failed")

	mockOS := &mockSearchClient{
		deleteFunc: func(ctx context.Context, id int64) error {
			return expectedErr
		},
	}

	handler := New(mockOS, newTestLogger())

	payload, _ := json.Marshal(map[string]int64{"id": 200})

	event := kafka.Event{
		EventID:       "event-err",
		EventType:     "TutorDeleted",
		AggregateType: "Tutor",
		AggregateID:   "200",
		Payload:       payload,
		CreatedAt:     time.Now().Format(time.RFC3339),
	}

	err := handler.Handle(context.Background(), event)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to delete tutor 200")
	assert.ErrorIs(t, err, expectedErr)
}

func TestEventHandler_ContextCancellation(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	mockOS := &mockSearchClient{
		upsertFunc: func(ctx context.Context, tutor *domain.Tutor) error {
			// Check if context is canceled
			if ctx.Err() != nil {
				return ctx.Err()
			}
			return nil
		},
	}

	handler := New(mockOS, newTestLogger())

	tutor := domain.Tutor{ID: 300}
	payload, _ := json.Marshal(tutor)

	event := kafka.Event{
		EventID:       "event-ctx",
		EventType:     "TutorCreated",
		AggregateType: "Tutor",
		AggregateID:   "300",
		Payload:       payload,
		CreatedAt:     time.Now().Format(time.RFC3339),
	}

	err := handler.Handle(ctx, event)

	assert.Error(t, err)
}

func TestEventHandler_AllEventTypes_TableDriven(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		eventType   string
		setupMock   func() *mockSearchClient
		createEvent func() kafka.Event
		wantErr     bool
	}{
		{
			name:      "TutorCreated - valid payload",
			eventType: "TutorCreated",
			setupMock: func() *mockSearchClient {
				return &mockSearchClient{
					upsertFunc: func(ctx context.Context, tutor *domain.Tutor) error {
						return nil
					},
				}
			},
			createEvent: func() kafka.Event {
				tutor := domain.Tutor{ID: 1, FullName: "Alice"}
				payload, _ := json.Marshal(tutor)
				return kafka.Event{
					EventID:     "e1",
					EventType:   "TutorCreated",
					Payload:     payload,
					AggregateID: "1",
				}
			},
			wantErr: false,
		},
		{
			name:      "TutorUpdated - valid payload",
			eventType: "TutorUpdated",
			setupMock: func() *mockSearchClient {
				return &mockSearchClient{
					upsertFunc: func(ctx context.Context, tutor *domain.Tutor) error {
						return nil
					},
				}
			},
			createEvent: func() kafka.Event {
				tutor := domain.Tutor{ID: 2, FullName: "Bob"}
				payload, _ := json.Marshal(tutor)
				return kafka.Event{
					EventID:     "e2",
					EventType:   "TutorUpdated",
					Payload:     payload,
					AggregateID: "2",
				}
			},
			wantErr: false,
		},
		{
			name:      "TutorDeleted - valid payload",
			eventType: "TutorDeleted",
			setupMock: func() *mockSearchClient {
				return &mockSearchClient{
					deleteFunc: func(ctx context.Context, id int64) error {
						return nil
					},
				}
			},
			createEvent: func() kafka.Event {
				payload, _ := json.Marshal(map[string]int64{"id": 3})
				return kafka.Event{
					EventID:     "e3",
					EventType:   "TutorDeleted",
					Payload:     payload,
					AggregateID: "3",
				}
			},
			wantErr: false,
		},
		{
			name:      "TutorCreated - OpenSearch error",
			eventType: "TutorCreated",
			setupMock: func() *mockSearchClient {
				return &mockSearchClient{
					upsertFunc: func(ctx context.Context, tutor *domain.Tutor) error {
						return errors.New("index failed")
					},
				}
			},
			createEvent: func() kafka.Event {
				tutor := domain.Tutor{ID: 4}
				payload, _ := json.Marshal(tutor)
				return kafka.Event{
					EventID:     "e4",
					EventType:   "TutorCreated",
					Payload:     payload,
					AggregateID: "4",
				}
			},
			wantErr: true,
		},
		{
			name:      "TutorDeleted - OpenSearch error",
			eventType: "TutorDeleted",
			setupMock: func() *mockSearchClient {
				return &mockSearchClient{
					deleteFunc: func(ctx context.Context, id int64) error {
						return errors.New("delete failed")
					},
				}
			},
			createEvent: func() kafka.Event {
				payload, _ := json.Marshal(map[string]int64{"id": 5})
				return kafka.Event{
					EventID:     "e5",
					EventType:   "TutorDeleted",
					Payload:     payload,
					AggregateID: "5",
				}
			},
			wantErr: true,
		},
		{
			name:      "Unknown event type - no error",
			eventType: "UnknownEvent",
			setupMock: func() *mockSearchClient {
				return &mockSearchClient{}
			},
			createEvent: func() kafka.Event {
				return kafka.Event{
					EventID:     "e6",
					EventType:   "UnknownEvent",
					Payload:     json.RawMessage(`{}`),
					AggregateID: "6",
				}
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockOS := tt.setupMock()
			handler := New(mockOS, newTestLogger())
			event := tt.createEvent()

			err := handler.Handle(context.Background(), event)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestEventHandler_ComplexPayloadStructures(t *testing.T) {
	t.Parallel()

	t.Run("Tutor with all fields populated", func(t *testing.T) {
		t.Parallel()

		var capturedTutor *domain.Tutor
		mockOS := &mockSearchClient{
			upsertFunc: func(ctx context.Context, tutor *domain.Tutor) error {
				capturedTutor = tutor
				return nil
			},
		}

		handler := New(mockOS, newTestLogger())

		tutor := domain.Tutor{
			ID:           999,
			Slug:         "math-wizard",
			FullName:     "Math Wizard",
			AvatarURL:    "https://example.com/avatar.jpg",
			Headline:     "Expert Math Tutor",
			Bio:          "10 years of experience teaching mathematics at all levels",
			Subjects:     []string{"math", "algebra", "geometry", "calculus"},
			HourlyRate:   100.50,
			Rating:       4.95,
			ReviewsCount: 150,
			IsVerified:   true,
			Location:     "San Francisco, CA",
			Formats:      []string{"online", "in-person", "group"},
			CreatedAt:    time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
			UpdatedAt:    time.Date(2024, 12, 21, 0, 0, 0, 0, time.UTC),
		}

		payload, _ := json.Marshal(tutor)
		event := kafka.Event{
			EventID:     "complex-event",
			EventType:   "TutorCreated",
			Payload:     payload,
			AggregateID: "999",
		}

		err := handler.Handle(context.Background(), event)

		assert.NoError(t, err)
		require.NotNil(t, capturedTutor)
		assert.Equal(t, int64(999), capturedTutor.ID)
		assert.Equal(t, "math-wizard", capturedTutor.Slug)
		assert.Equal(t, "Math Wizard", capturedTutor.FullName)
		assert.Len(t, capturedTutor.Subjects, 4)
		assert.Contains(t, capturedTutor.Subjects, "calculus")
		assert.Equal(t, 100.50, capturedTutor.HourlyRate)
		assert.Equal(t, 4.95, capturedTutor.Rating)
		assert.Equal(t, 150, capturedTutor.ReviewsCount)
	})

	t.Run("Tutor with minimal fields", func(t *testing.T) {
		t.Parallel()

		var capturedTutor *domain.Tutor
		mockOS := &mockSearchClient{
			upsertFunc: func(ctx context.Context, tutor *domain.Tutor) error {
				capturedTutor = tutor
				return nil
			},
		}

		handler := New(mockOS, newTestLogger())

		tutor := domain.Tutor{
			ID:       1,
			FullName: "Minimal Tutor",
		}

		payload, _ := json.Marshal(tutor)
		event := kafka.Event{
			EventID:     "minimal-event",
			EventType:   "TutorCreated",
			Payload:     payload,
			AggregateID: "1",
		}

		err := handler.Handle(context.Background(), event)

		assert.NoError(t, err)
		require.NotNil(t, capturedTutor)
		assert.Equal(t, int64(1), capturedTutor.ID)
		assert.Equal(t, "Minimal Tutor", capturedTutor.FullName)
		assert.Empty(t, capturedTutor.Subjects)
		assert.Empty(t, capturedTutor.Formats)
	})

	t.Run("Tutor with empty arrays", func(t *testing.T) {
		t.Parallel()

		var capturedTutor *domain.Tutor
		mockOS := &mockSearchClient{
			upsertFunc: func(ctx context.Context, tutor *domain.Tutor) error {
				capturedTutor = tutor
				return nil
			},
		}

		handler := New(mockOS, newTestLogger())

		tutor := domain.Tutor{
			ID:       2,
			FullName: "Empty Arrays Tutor",
			Subjects: []string{},
			Formats:  []string{},
		}

		payload, _ := json.Marshal(tutor)
		event := kafka.Event{
			EventID:     "empty-arrays-event",
			EventType:   "TutorCreated",
			Payload:     payload,
			AggregateID: "2",
		}

		err := handler.Handle(context.Background(), event)

		assert.NoError(t, err)
		require.NotNil(t, capturedTutor)
		assert.NotNil(t, capturedTutor.Subjects)
		assert.NotNil(t, capturedTutor.Formats)
		assert.Empty(t, capturedTutor.Subjects)
		assert.Empty(t, capturedTutor.Formats)
	})
}
