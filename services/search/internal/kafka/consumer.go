package kafka

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/segmentio/kafka-go"
)

// MessageReader is an interface for reading Kafka messages.
type MessageReader interface {
	ReadMessage(ctx context.Context) (kafka.Message, error)
	Close() error
	Config() kafka.ReaderConfig
}

// Consumer reads events from Kafka and processes them.
type Consumer struct {
	reader MessageReader
	logger *slog.Logger
}

// Config holds Kafka consumer configuration.
type Config struct {
	Brokers []string
	Topic   string
	GroupID string
}

// NewConsumer creates a new Kafka consumer.
func NewConsumer(cfg Config, logger *slog.Logger) *Consumer {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  cfg.Brokers,
		Topic:    cfg.Topic,
		GroupID:  cfg.GroupID,
		MinBytes: 1,
		MaxBytes: 10e6,
	})

	return &Consumer{
		reader: reader,
		logger: logger,
	}
}

// Start begins consuming messages from Kafka.
// Phase 2: Log-only, no side effects yet.
func (c *Consumer) Start(ctx context.Context) error {
	c.logger.Info("Starting Kafka consumer",
		"topic", c.reader.Config().Topic,
		"group_id", c.reader.Config().GroupID,
	)

	for {
		select {
		case <-ctx.Done():
			c.logger.Info("Kafka consumer stopping")
			return c.reader.Close()
		default:
			msg, err := c.reader.ReadMessage(ctx)
			if err != nil {
				if ctx.Err() != nil {
					return nil
				}
				c.logger.Error("Failed to read message", "error", err)
				continue
			}

			var event Event
			if err := json.Unmarshal(msg.Value, &event); err != nil {
				c.logger.Error("Failed to unmarshal event",
					"error", err,
					"offset", msg.Offset,
				)
				continue
			}

			c.logger.Info("Received event",
				"event_id", event.EventID,
				"event_type", event.EventType,
				"aggregate_type", event.AggregateType,
				"aggregate_id", event.AggregateID,
				"offset", msg.Offset,
			)
		}
	}
}

// Close closes the consumer connection.
func (c *Consumer) Close() error {
	return c.reader.Close()
}
