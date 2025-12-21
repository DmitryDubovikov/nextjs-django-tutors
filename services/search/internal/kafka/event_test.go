package kafka

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEvent_UnmarshalJSON(t *testing.T) {
	tests := []struct {
		name      string
		jsonData  string
		wantEvent Event
		wantErr   bool
	}{
		{
			name: "valid tutor created event",
			jsonData: `{
				"event_id": "123e4567-e89b-12d3-a456-426614174000",
				"event_type": "TutorCreated",
				"aggregate_type": "Tutor",
				"aggregate_id": "42",
				"payload": {"id": 42, "headline": "Math Teacher"},
				"created_at": "2025-12-20T10:00:00Z"
			}`,
			wantEvent: Event{
				EventID:       "123e4567-e89b-12d3-a456-426614174000",
				EventType:     "TutorCreated",
				AggregateType: "Tutor",
				AggregateID:   "42",
				Payload:       json.RawMessage(`{"id": 42, "headline": "Math Teacher"}`),
				CreatedAt:     "2025-12-20T10:00:00Z",
			},
			wantErr: false,
		},
		{
			name: "valid tutor updated event",
			jsonData: `{
				"event_id": "223e4567-e89b-12d3-a456-426614174000",
				"event_type": "TutorUpdated",
				"aggregate_type": "Tutor",
				"aggregate_id": "43",
				"payload": {"id": 43, "headline": "Physics Teacher", "rating": 4.5},
				"created_at": "2025-12-20T11:00:00Z"
			}`,
			wantEvent: Event{
				EventID:       "223e4567-e89b-12d3-a456-426614174000",
				EventType:     "TutorUpdated",
				AggregateType: "Tutor",
				AggregateID:   "43",
				Payload:       json.RawMessage(`{"id": 43, "headline": "Physics Teacher", "rating": 4.5}`),
				CreatedAt:     "2025-12-20T11:00:00Z",
			},
			wantErr: false,
		},
		{
			name: "valid tutor deleted event with minimal payload",
			jsonData: `{
				"event_id": "323e4567-e89b-12d3-a456-426614174000",
				"event_type": "TutorDeleted",
				"aggregate_type": "Tutor",
				"aggregate_id": "44",
				"payload": {"id": 44},
				"created_at": "2025-12-20T12:00:00Z"
			}`,
			wantEvent: Event{
				EventID:       "323e4567-e89b-12d3-a456-426614174000",
				EventType:     "TutorDeleted",
				AggregateType: "Tutor",
				AggregateID:   "44",
				Payload:       json.RawMessage(`{"id": 44}`),
				CreatedAt:     "2025-12-20T12:00:00Z",
			},
			wantErr: false,
		},
		{
			name: "event with empty payload",
			jsonData: `{
				"event_id": "423e4567-e89b-12d3-a456-426614174000",
				"event_type": "TutorEvent",
				"aggregate_type": "Tutor",
				"aggregate_id": "45",
				"payload": {},
				"created_at": "2025-12-20T13:00:00Z"
			}`,
			wantEvent: Event{
				EventID:       "423e4567-e89b-12d3-a456-426614174000",
				EventType:     "TutorEvent",
				AggregateType: "Tutor",
				AggregateID:   "45",
				Payload:       json.RawMessage(`{}`),
				CreatedAt:     "2025-12-20T13:00:00Z",
			},
			wantErr: false,
		},
		{
			name: "event with complex nested payload",
			jsonData: `{
				"event_id": "523e4567-e89b-12d3-a456-426614174000",
				"event_type": "TutorAvailabilityUpdated",
				"aggregate_type": "Tutor",
				"aggregate_id": "46",
				"payload": {
					"id": 46,
					"headline": "Chemistry Teacher",
					"availabilities": [
						{"day_of_week": 0, "start_time": "09:00:00", "end_time": "17:00:00"},
						{"day_of_week": 1, "start_time": "10:00:00", "end_time": "18:00:00"}
					]
				},
				"created_at": "2025-12-20T14:00:00Z"
			}`,
			wantEvent: Event{
				EventID:       "523e4567-e89b-12d3-a456-426614174000",
				EventType:     "TutorAvailabilityUpdated",
				AggregateType: "Tutor",
				AggregateID:   "46",
				Payload: json.RawMessage(`{
					"id": 46,
					"headline": "Chemistry Teacher",
					"availabilities": [
						{"day_of_week": 0, "start_time": "09:00:00", "end_time": "17:00:00"},
						{"day_of_week": 1, "start_time": "10:00:00", "end_time": "18:00:00"}
					]
				}`),
				CreatedAt: "2025-12-20T14:00:00Z",
			},
			wantErr: false,
		},
		{
			name:     "invalid json",
			jsonData: `{invalid json}`,
			wantErr:  true,
		},
		{
			name:     "empty json",
			jsonData: ``,
			wantErr:  true,
		},
		{
			name: "missing required field event_id",
			jsonData: `{
				"event_type": "TutorCreated",
				"aggregate_type": "Tutor",
				"aggregate_id": "47",
				"payload": {},
				"created_at": "2025-12-20T15:00:00Z"
			}`,
			wantEvent: Event{
				EventType:     "TutorCreated",
				AggregateType: "Tutor",
				AggregateID:   "47",
				Payload:       json.RawMessage(`{}`),
				CreatedAt:     "2025-12-20T15:00:00Z",
			},
			wantErr: false, // JSON unmarshal doesn't fail, just leaves field empty
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var event Event
			err := json.Unmarshal([]byte(tt.jsonData), &event)

			if tt.wantErr {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantEvent.EventID, event.EventID)
			assert.Equal(t, tt.wantEvent.EventType, event.EventType)
			assert.Equal(t, tt.wantEvent.AggregateType, event.AggregateType)
			assert.Equal(t, tt.wantEvent.AggregateID, event.AggregateID)
			assert.Equal(t, tt.wantEvent.CreatedAt, event.CreatedAt)
			// For payload, just check it's valid JSON
			assert.JSONEq(t, string(tt.wantEvent.Payload), string(event.Payload))
		})
	}
}

func TestEvent_MarshalJSON(t *testing.T) {
	tests := []struct {
		name     string
		event    Event
		wantJSON string
	}{
		{
			name: "marshal complete event",
			event: Event{
				EventID:       "123e4567-e89b-12d3-a456-426614174000",
				EventType:     "TutorCreated",
				AggregateType: "Tutor",
				AggregateID:   "42",
				Payload:       json.RawMessage(`{"id": 42, "headline": "Math Teacher"}`),
				CreatedAt:     "2025-12-20T10:00:00Z",
			},
			wantJSON: `{
				"event_id": "123e4567-e89b-12d3-a456-426614174000",
				"event_type": "TutorCreated",
				"aggregate_type": "Tutor",
				"aggregate_id": "42",
				"payload": {"id": 42, "headline": "Math Teacher"},
				"created_at": "2025-12-20T10:00:00Z"
			}`,
		},
		{
			name: "marshal event with empty payload",
			event: Event{
				EventID:       "223e4567-e89b-12d3-a456-426614174000",
				EventType:     "TutorDeleted",
				AggregateType: "Tutor",
				AggregateID:   "43",
				Payload:       json.RawMessage(`{}`),
				CreatedAt:     "2025-12-20T11:00:00Z",
			},
			wantJSON: `{
				"event_id": "223e4567-e89b-12d3-a456-426614174000",
				"event_type": "TutorDeleted",
				"aggregate_type": "Tutor",
				"aggregate_id": "43",
				"payload": {},
				"created_at": "2025-12-20T11:00:00Z"
			}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := json.Marshal(tt.event)
			require.NoError(t, err)
			assert.JSONEq(t, tt.wantJSON, string(data))
		})
	}
}

func TestEvent_PayloadExtraction(t *testing.T) {
	tests := []struct {
		name            string
		event           Event
		wantPayloadType interface{}
		wantErr         bool
	}{
		{
			name: "extract tutor payload",
			event: Event{
				EventID:       "123e4567-e89b-12d3-a456-426614174000",
				EventType:     "TutorCreated",
				AggregateType: "Tutor",
				AggregateID:   "42",
				Payload:       json.RawMessage(`{"id": 42, "headline": "Math Teacher", "rating": 4.5}`),
				CreatedAt:     "2025-12-20T10:00:00Z",
			},
			wantPayloadType: map[string]interface{}{
				"id":       float64(42),
				"headline": "Math Teacher",
				"rating":   4.5,
			},
			wantErr: false,
		},
		{
			name: "extract deleted payload",
			event: Event{
				EventID:       "223e4567-e89b-12d3-a456-426614174000",
				EventType:     "TutorDeleted",
				AggregateType: "Tutor",
				AggregateID:   "43",
				Payload:       json.RawMessage(`{"id": 43}`),
				CreatedAt:     "2025-12-20T11:00:00Z",
			},
			wantPayloadType: map[string]interface{}{
				"id": float64(43),
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var payload map[string]interface{}
			err := json.Unmarshal(tt.event.Payload, &payload)

			if tt.wantErr {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantPayloadType, payload)
		})
	}
}

func TestEvent_RoundTrip(t *testing.T) {
	original := Event{
		EventID:       "123e4567-e89b-12d3-a456-426614174000",
		EventType:     "TutorCreated",
		AggregateType: "Tutor",
		AggregateID:   "42",
		Payload:       json.RawMessage(`{"id": 42, "headline": "Math Teacher", "rating": 4.5}`),
		CreatedAt:     "2025-12-20T10:00:00Z",
	}

	// Marshal
	data, err := json.Marshal(original)
	require.NoError(t, err)

	// Unmarshal
	var decoded Event
	err = json.Unmarshal(data, &decoded)
	require.NoError(t, err)

	// Compare
	assert.Equal(t, original.EventID, decoded.EventID)
	assert.Equal(t, original.EventType, decoded.EventType)
	assert.Equal(t, original.AggregateType, decoded.AggregateType)
	assert.Equal(t, original.AggregateID, decoded.AggregateID)
	assert.Equal(t, original.CreatedAt, decoded.CreatedAt)
	assert.JSONEq(t, string(original.Payload), string(decoded.Payload))
}
