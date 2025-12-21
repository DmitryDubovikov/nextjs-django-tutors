package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"search/internal/domain"
	"search/internal/kafka"
	"search/internal/opensearch"
)

// EventHandler processes Kafka events and updates OpenSearch.
type EventHandler struct {
	os     opensearch.SearchClient
	logger *slog.Logger
}

// New creates a new EventHandler.
func New(os opensearch.SearchClient, logger *slog.Logger) *EventHandler {
	return &EventHandler{os: os, logger: logger}
}

// Handle processes a single event and updates OpenSearch accordingly.
func (h *EventHandler) Handle(ctx context.Context, event kafka.Event) error {
	h.logger.Info("Processing event",
		"event_id", event.EventID,
		"event_type", event.EventType,
		"aggregate_id", event.AggregateID,
	)

	switch event.EventType {
	case "TutorCreated", "TutorUpdated":
		return h.handleTutorUpsert(ctx, event)
	case "TutorDeleted":
		return h.handleTutorDelete(ctx, event)
	default:
		h.logger.Warn("Unknown event type, skipping",
			"event_type", event.EventType,
			"event_id", event.EventID,
		)
		return nil
	}
}

func (h *EventHandler) handleTutorUpsert(ctx context.Context, event kafka.Event) error {
	var tutor domain.Tutor
	if err := json.Unmarshal(event.Payload, &tutor); err != nil {
		return fmt.Errorf("failed to unmarshal tutor payload: %w", err)
	}

	if err := h.os.UpsertTutor(ctx, &tutor); err != nil {
		return fmt.Errorf("failed to upsert tutor %d: %w", tutor.ID, err)
	}

	h.logger.Info("Tutor upserted successfully",
		"event_id", event.EventID,
		"tutor_id", tutor.ID,
		"event_type", event.EventType,
	)

	return nil
}

func (h *EventHandler) handleTutorDelete(ctx context.Context, event kafka.Event) error {
	var payload struct {
		ID int64 `json:"id"`
	}
	if err := json.Unmarshal(event.Payload, &payload); err != nil {
		return fmt.Errorf("failed to unmarshal delete payload: %w", err)
	}

	if payload.ID <= 0 {
		return fmt.Errorf("invalid tutor ID in delete payload: %d", payload.ID)
	}

	if err := h.os.DeleteTutor(ctx, payload.ID); err != nil {
		return fmt.Errorf("failed to delete tutor %d: %w", payload.ID, err)
	}

	h.logger.Info("Tutor deleted successfully",
		"event_id", event.EventID,
		"tutor_id", payload.ID,
	)

	return nil
}
