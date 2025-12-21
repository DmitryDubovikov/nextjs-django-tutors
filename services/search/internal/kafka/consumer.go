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

// EventHandler defines the interface for handling events.
type EventHandler interface {
	Handle(ctx context.Context, event Event) error
}

// Consumer reads events from Kafka and processes them.
type Consumer struct {
	reader  MessageReader
	handler EventHandler
	logger  *slog.Logger
}

// Config holds Kafka consumer configuration.
type Config struct {
	Brokers []string
	Topic   string
	GroupID string
}

// NewConsumer creates a new Kafka consumer.
func NewConsumer(cfg Config, handler EventHandler, logger *slog.Logger) *Consumer {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  cfg.Brokers,
		Topic:    cfg.Topic,
		GroupID:  cfg.GroupID,
		MinBytes: 1,
		MaxBytes: 10e6,
	})

	return &Consumer{
		reader:  reader,
		handler: handler,
		logger:  logger,
	}
}

// NewConsumerWithReader creates a new Kafka consumer with a custom reader (for testing).
func NewConsumerWithReader(reader MessageReader, handler EventHandler, logger *slog.Logger) *Consumer {
	return &Consumer{
		reader:  reader,
		handler: handler,
		logger:  logger,
	}
}

// Start begins consuming messages from Kafka.
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

			if err := c.handler.Handle(ctx, event); err != nil {
				c.logger.Error("Failed to handle event",
					"event_id", event.EventID,
					"event_type", event.EventType,
					"aggregate_id", event.AggregateID,
					"error", err,
				)
				continue
			}

			c.logger.Info("Event processed successfully",
				"event_id", event.EventID,
				"event_type", event.EventType,
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
