package opensearch

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/opensearch-project/opensearch-go/v4"
	"github.com/opensearch-project/opensearch-go/v4/opensearchapi"
)

type Client struct {
	client *opensearchapi.Client
	logger *slog.Logger
}

func NewClient(url string, logger *slog.Logger) (*Client, error) {
	client, err := opensearchapi.NewClient(opensearchapi.Config{
		Client: opensearch.Config{
			Addresses: []string{url},
			Transport: http.DefaultTransport,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create opensearch client: %w", err)
	}

	return &Client{
		client: client,
		logger: logger,
	}, nil
}

func (c *Client) Ping(ctx context.Context) error {
	_, err := c.client.Cluster.Health(ctx, nil)
	if err != nil {
		return fmt.Errorf("opensearch ping failed: %w", err)
	}
	return nil
}

func (c *Client) GetClient() *opensearchapi.Client {
	return c.client
}
