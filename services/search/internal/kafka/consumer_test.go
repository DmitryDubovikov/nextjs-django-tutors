package kafka

import (
	"context"
	"encoding/json"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/segmentio/kafka-go"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockKafkaReader is a mock implementation of MessageReader for testing.
type mockKafkaReader struct {
	messages     []kafka.Message
	readIndex    int
	readError    error
	closeError   error
	closeCalled  bool
	configReturn kafka.ReaderConfig
}

func (m *mockKafkaReader) ReadMessage(ctx context.Context) (kafka.Message, error) {
	if m.readError != nil {
		return kafka.Message{}, m.readError
	}

	if m.readIndex >= len(m.messages) {
		<-ctx.Done()
		return kafka.Message{}, ctx.Err()
	}

	msg := m.messages[m.readIndex]
	m.readIndex++
	return msg, nil
}

func (m *mockKafkaReader) Close() error {
	m.closeCalled = true
	return m.closeError
}

func (m *mockKafkaReader) Config() kafka.ReaderConfig {
	return m.configReturn
}

func TestNewConsumer(t *testing.T) {
	tests := []struct {
		name   string
		config Config
	}{
		{
			name: "create consumer with valid config",
			config: Config{
				Brokers: []string{"localhost:9092"},
				Topic:   "tutor-events",
				GroupID: "search-service",
			},
		},
		{
			name: "create consumer with multiple brokers",
			config: Config{
				Brokers: []string{"broker1:9092", "broker2:9092", "broker3:9092"},
				Topic:   "test-topic",
				GroupID: "test-group",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			consumer := NewConsumer(tt.config, logger)

			require.NotNil(t, consumer)
			require.NotNil(t, consumer.reader)
			require.NotNil(t, consumer.logger)

			readerCfg := consumer.reader.Config()
			assert.Equal(t, tt.config.Brokers, readerCfg.Brokers)
			assert.Equal(t, tt.config.Topic, readerCfg.Topic)
			assert.Equal(t, tt.config.GroupID, readerCfg.GroupID)
			assert.Equal(t, 1, readerCfg.MinBytes)
			assert.Equal(t, 10000000, readerCfg.MaxBytes)
		})
	}
}

func TestConsumer_Start_ProcessesMessages(t *testing.T) {
	event1 := Event{
		EventID:       "event-1",
		EventType:     "TutorCreated",
		AggregateType: "Tutor",
		AggregateID:   "1",
		Payload:       json.RawMessage(`{"id": 1}`),
		CreatedAt:     "2025-12-20T10:00:00Z",
	}
	event1Bytes, _ := json.Marshal(event1)

	event2 := Event{
		EventID:       "event-2",
		EventType:     "TutorUpdated",
		AggregateType: "Tutor",
		AggregateID:   "2",
		Payload:       json.RawMessage(`{"id": 2}`),
		CreatedAt:     "2025-12-20T11:00:00Z",
	}
	event2Bytes, _ := json.Marshal(event2)

	tests := []struct {
		name     string
		messages []kafka.Message
	}{
		{
			name: "process single message",
			messages: []kafka.Message{
				{Key: []byte("1"), Value: event1Bytes, Offset: 0},
			},
		},
		{
			name: "process multiple messages",
			messages: []kafka.Message{
				{Key: []byte("1"), Value: event1Bytes, Offset: 0},
				{Key: []byte("2"), Value: event2Bytes, Offset: 1},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			mockReader := &mockKafkaReader{
				messages: tt.messages,
				configReturn: kafka.ReaderConfig{
					Topic:   "test-topic",
					GroupID: "test-group",
				},
			}
			consumer := &Consumer{
				reader: mockReader,
				logger: logger,
			}

			ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
			defer cancel()

			err := consumer.Start(ctx)
			assert.NoError(t, err)
			assert.Equal(t, len(tt.messages), mockReader.readIndex)
		})
	}
}

func TestConsumer_Start_HandlesInvalidJSON(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	mockReader := &mockKafkaReader{
		messages: []kafka.Message{
			{Key: []byte("1"), Value: []byte(`{invalid json}`), Offset: 0},
		},
		configReturn: kafka.ReaderConfig{
			Topic:   "test-topic",
			GroupID: "test-group",
		},
	}
	consumer := &Consumer{
		reader: mockReader,
		logger: logger,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	err := consumer.Start(ctx)
	assert.NoError(t, err)
	assert.Equal(t, 1, mockReader.readIndex)
}

func TestConsumer_Start_CancelsCleanly(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	mockReader := &mockKafkaReader{
		messages: []kafka.Message{},
		configReturn: kafka.ReaderConfig{
			Topic:   "test-topic",
			GroupID: "test-group",
		},
	}
	consumer := &Consumer{
		reader: mockReader,
		logger: logger,
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	err := consumer.Start(ctx)
	assert.NoError(t, err)
	assert.True(t, mockReader.closeCalled)
}

func TestConsumer_Close(t *testing.T) {
	tests := []struct {
		name       string
		closeError error
		wantErr    bool
	}{
		{
			name:       "successful close",
			closeError: nil,
			wantErr:    false,
		},
		{
			name:       "close with error",
			closeError: assert.AnError,
			wantErr:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			mockReader := &mockKafkaReader{closeError: tt.closeError}
			consumer := &Consumer{
				reader: mockReader,
				logger: logger,
			}

			err := consumer.Close()
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
			assert.True(t, mockReader.closeCalled)
		})
	}
}

func TestConsumer_Start_MultipleEventTypes(t *testing.T) {
	events := []Event{
		{EventID: "event-1", EventType: "TutorCreated", AggregateType: "Tutor", AggregateID: "1", Payload: json.RawMessage(`{"id": 1}`), CreatedAt: "2025-12-20T10:00:00Z"},
		{EventID: "event-2", EventType: "TutorUpdated", AggregateType: "Tutor", AggregateID: "2", Payload: json.RawMessage(`{"id": 2}`), CreatedAt: "2025-12-20T11:00:00Z"},
		{EventID: "event-3", EventType: "TutorDeleted", AggregateType: "Tutor", AggregateID: "3", Payload: json.RawMessage(`{"id": 3}`), CreatedAt: "2025-12-20T12:00:00Z"},
		{EventID: "event-4", EventType: "TutorAvailabilityUpdated", AggregateType: "Tutor", AggregateID: "4", Payload: json.RawMessage(`{"id": 4, "availabilities": []}`), CreatedAt: "2025-12-20T13:00:00Z"},
	}

	var messages []kafka.Message
	for i, event := range events {
		eventBytes, _ := json.Marshal(event)
		messages = append(messages, kafka.Message{
			Key:    []byte(event.AggregateID),
			Value:  eventBytes,
			Offset: int64(i),
		})
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	mockReader := &mockKafkaReader{
		messages: messages,
		configReturn: kafka.ReaderConfig{
			Topic:   "tutor-events",
			GroupID: "search-service",
		},
	}
	consumer := &Consumer{
		reader: mockReader,
		logger: logger,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	err := consumer.Start(ctx)
	assert.NoError(t, err)
	assert.Equal(t, len(events), mockReader.readIndex)
}

func TestConsumer_Start_ContextCancellation(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	mockReader := &mockKafkaReader{
		messages: []kafka.Message{},
		configReturn: kafka.ReaderConfig{
			Topic:   "test-topic",
			GroupID: "test-group",
		},
	}
	consumer := &Consumer{
		reader: mockReader,
		logger: logger,
	}

	ctx, cancel := context.WithCancel(context.Background())

	done := make(chan error, 1)
	go func() {
		done <- consumer.Start(ctx)
	}()

	time.Sleep(50 * time.Millisecond)
	cancel()

	select {
	case err := <-done:
		assert.NoError(t, err)
	case <-time.After(1 * time.Second):
		t.Fatal("Consumer did not stop within timeout")
	}
}
