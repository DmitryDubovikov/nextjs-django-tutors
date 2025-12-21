package kafka

import "encoding/json"

// Event represents a domain event from Django outbox.
type Event struct {
	EventID       string          `json:"event_id"`
	EventType     string          `json:"event_type"`
	AggregateType string          `json:"aggregate_type"`
	AggregateID   string          `json:"aggregate_id"`
	Payload       json.RawMessage `json:"payload"`
	CreatedAt     string          `json:"created_at"`
}
