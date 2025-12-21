package opensearch

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/opensearch-project/opensearch-go/v4/opensearchapi"

	"search/internal/domain"
)

type SearchQuery struct {
	Text      string
	Subjects  []string
	MinPrice  *float64
	MaxPrice  *float64
	MinRating *float64
	Format    string
	Location  string
	Limit     int
	Offset    int
}

type SearchResponse struct {
	Results []domain.Tutor `json:"results"`
	Total   int            `json:"total"`
}

func (c *Client) UpsertTutor(ctx context.Context, tutor *domain.Tutor) error {
	body, err := json.Marshal(tutor)
	if err != nil {
		return fmt.Errorf("failed to marshal tutor: %w", err)
	}

	_, err = c.client.Index(ctx, opensearchapi.IndexReq{
		Index:      IndexName,
		DocumentID: strconv.FormatInt(tutor.ID, 10),
		Body:       bytes.NewReader(body),
		Params: opensearchapi.IndexParams{
			Refresh: "true",
		},
	})
	if err != nil {
		return fmt.Errorf("failed to index tutor: %w", err)
	}

	c.logger.Debug("Tutor indexed", "id", tutor.ID)
	return nil
}

func (c *Client) DeleteTutor(ctx context.Context, id int64) error {
	resp, err := c.client.Document.Delete(ctx, opensearchapi.DocumentDeleteReq{
		Index:      IndexName,
		DocumentID: strconv.FormatInt(id, 10),
		Params: opensearchapi.DocumentDeleteParams{
			Refresh: "true",
		},
	})
	if err != nil {
		return fmt.Errorf("failed to delete tutor from index: %w", err)
	}

	if resp.Result == "not_found" {
		c.logger.Debug("Tutor not found in index (already deleted)", "id", id)
		return nil
	}

	c.logger.Debug("Tutor deleted", "id", id, "result", resp.Result)
	return nil
}

func (c *Client) SearchTutors(ctx context.Context, query SearchQuery) (*SearchResponse, error) {
	q := buildSearchQuery(query)

	body, err := json.Marshal(q)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal search query: %w", err)
	}

	resp, err := c.client.Search(ctx, &opensearchapi.SearchReq{
		Indices: []string{IndexName},
		Body:    bytes.NewReader(body),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to search tutors: %w", err)
	}

	tutors := make([]domain.Tutor, 0, len(resp.Hits.Hits))
	for _, hit := range resp.Hits.Hits {
		var tutor domain.Tutor
		if err := json.Unmarshal(hit.Source, &tutor); err != nil {
			c.logger.Warn("Failed to unmarshal tutor", "error", err)
			continue
		}
		tutors = append(tutors, tutor)
	}

	return &SearchResponse{
		Results: tutors,
		Total:   resp.Hits.Total.Value,
	}, nil
}

func buildSearchQuery(query SearchQuery) map[string]any {
	must := []map[string]any{}
	filter := []map[string]any{}

	if query.Text != "" {
		// Use bool query with should to support both:
		// - phrase_prefix: partial word matching ("mar" -> "Marie")
		// - fuzziness: typo tolerance ("marei" -> "Marie")
		must = append(must, map[string]any{
			"bool": map[string]any{
				"should": []map[string]any{
					{
						"multi_match": map[string]any{
							"query":     query.Text,
							"fields":    []string{"full_name", "headline^2", "bio"},
							"fuzziness": "AUTO",
						},
					},
					{
						"multi_match": map[string]any{
							"query":  query.Text,
							"fields": []string{"full_name", "headline^2", "bio"},
							"type":   "phrase_prefix",
						},
					},
				},
				"minimum_should_match": 1,
			},
		})
	}

	if len(query.Subjects) > 0 {
		filter = append(filter, map[string]any{
			"terms": map[string]any{
				"subjects": query.Subjects,
			},
		})
	}

	if query.MinPrice != nil || query.MaxPrice != nil {
		rangeQuery := map[string]any{}
		if query.MinPrice != nil {
			rangeQuery["gte"] = *query.MinPrice
		}
		if query.MaxPrice != nil {
			rangeQuery["lte"] = *query.MaxPrice
		}
		filter = append(filter, map[string]any{
			"range": map[string]any{
				"hourly_rate": rangeQuery,
			},
		})
	}

	if query.MinRating != nil {
		filter = append(filter, map[string]any{
			"range": map[string]any{
				"rating": map[string]any{
					"gte": *query.MinRating,
				},
			},
		})
	}

	if query.Format != "" {
		filter = append(filter, map[string]any{
			"term": map[string]any{
				"formats": query.Format,
			},
		})
	}

	if query.Location != "" {
		filter = append(filter, map[string]any{
			"term": map[string]any{
				"location": query.Location,
			},
		})
	}

	const maxLimit = 100
	limit := query.Limit
	if limit <= 0 {
		limit = 20
	} else if limit > maxLimit {
		limit = maxLimit
	}

	offset := query.Offset
	if offset < 0 {
		offset = 0
	}

	boolQuery := map[string]any{}
	if len(must) > 0 {
		boolQuery["must"] = must
	}
	if len(filter) > 0 {
		boolQuery["filter"] = filter
	}

	q := map[string]any{
		"size": limit,
		"from": offset,
	}

	if len(boolQuery) > 0 {
		q["query"] = map[string]any{
			"bool": boolQuery,
		}
	} else {
		q["query"] = map[string]any{
			"match_all": map[string]any{},
		}
	}

	return q
}
