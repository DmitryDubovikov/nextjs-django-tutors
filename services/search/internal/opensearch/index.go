package opensearch

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"

	"github.com/opensearch-project/opensearch-go/v4/opensearchapi"
)

const IndexName = "tutors"

var indexMapping = map[string]any{
	"settings": map[string]any{
		"number_of_shards":   1,
		"number_of_replicas": 0,
		"analysis": map[string]any{
			"analyzer": map[string]any{
				"english_analyzer": map[string]any{
					"type":      "custom",
					"tokenizer": "standard",
					"filter":    []string{"lowercase", "english_stemmer"},
				},
			},
			"filter": map[string]any{
				"english_stemmer": map[string]any{
					"type":     "stemmer",
					"language": "english",
				},
			},
		},
	},
	"mappings": map[string]any{
		"properties": map[string]any{
			"id":            map[string]any{"type": "integer"},
			"slug":          map[string]any{"type": "keyword"},
			"full_name":     map[string]any{"type": "text", "analyzer": "english_analyzer"},
			"avatar_url":    map[string]any{"type": "keyword", "index": false},
			"headline":      map[string]any{"type": "text", "analyzer": "english_analyzer"},
			"bio":           map[string]any{"type": "text", "analyzer": "english_analyzer"},
			"subjects":      map[string]any{"type": "keyword"},
			"hourly_rate":   map[string]any{"type": "float"},
			"rating":        map[string]any{"type": "float"},
			"reviews_count": map[string]any{"type": "integer"},
			"is_verified":   map[string]any{"type": "boolean"},
			"location":      map[string]any{"type": "keyword"},
			"formats":       map[string]any{"type": "keyword"},
			"created_at":    map[string]any{"type": "date"},
			"updated_at":    map[string]any{"type": "date"},
		},
	},
}

func (c *Client) EnsureIndex(ctx context.Context) error {
	exists, err := c.indexExists(ctx)
	if err != nil {
		return err
	}

	if exists {
		c.logger.Info("Index already exists", "index", IndexName)
		return nil
	}

	return c.createIndex(ctx)
}

func (c *Client) indexExists(ctx context.Context) (bool, error) {
	_, err := c.client.Indices.Exists(ctx, opensearchapi.IndicesExistsReq{
		Indices: []string{IndexName},
	})
	if err != nil {
		// Exists returns error when index doesn't exist
		return false, nil
	}
	return true, nil
}

func (c *Client) createIndex(ctx context.Context) error {
	body, err := json.Marshal(indexMapping)
	if err != nil {
		return fmt.Errorf("failed to marshal index mapping: %w", err)
	}

	_, err = c.client.Indices.Create(ctx, opensearchapi.IndicesCreateReq{
		Index: IndexName,
		Body:  bytes.NewReader(body),
	})
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}

	c.logger.Info("Index created successfully", "index", IndexName)
	return nil
}
