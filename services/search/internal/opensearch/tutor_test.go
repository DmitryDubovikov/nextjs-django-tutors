package opensearch

import (
	"testing"
)

func TestBuildSearchQuery_EmptyQuery(t *testing.T) {
	query := SearchQuery{}
	result := buildSearchQuery(query)

	if _, ok := result["query"]; !ok {
		t.Error("missing query field")
	}
	if _, ok := result["size"]; !ok {
		t.Error("missing size field")
	}
	if _, ok := result["from"]; !ok {
		t.Error("missing from field")
	}

	q := result["query"].(map[string]any)
	if _, ok := q["match_all"]; !ok {
		t.Error("empty query should use match_all")
	}
}

func TestBuildSearchQuery_TextSearch(t *testing.T) {
	query := SearchQuery{
		Text: "математика",
	}
	result := buildSearchQuery(query)

	q := result["query"].(map[string]any)
	boolQuery := q["bool"].(map[string]any)
	must := boolQuery["must"].([]map[string]any)

	if len(must) != 1 {
		t.Errorf("expected 1 must clause, got %d", len(must))
	}

	multiMatch := must[0]["multi_match"].(map[string]any)
	if multiMatch["query"] != "математика" {
		t.Errorf("expected query 'математика', got %v", multiMatch["query"])
	}
	if multiMatch["fuzziness"] != "AUTO" {
		t.Errorf("expected fuzziness AUTO, got %v", multiMatch["fuzziness"])
	}
}

func TestBuildSearchQuery_Subjects(t *testing.T) {
	query := SearchQuery{
		Subjects: []string{"math", "physics"},
	}
	result := buildSearchQuery(query)

	q := result["query"].(map[string]any)
	boolQuery := q["bool"].(map[string]any)
	filter := boolQuery["filter"].([]map[string]any)

	if len(filter) != 1 {
		t.Errorf("expected 1 filter clause, got %d", len(filter))
	}

	terms := filter[0]["terms"].(map[string]any)
	subjects := terms["subjects"].([]string)

	if len(subjects) != 2 || subjects[0] != "math" || subjects[1] != "physics" {
		t.Errorf("unexpected subjects: %v", subjects)
	}
}

func TestBuildSearchQuery_PriceRange(t *testing.T) {
	minPrice := 500.0
	maxPrice := 2000.0

	tests := []struct {
		name     string
		minPrice *float64
		maxPrice *float64
	}{
		{"min only", &minPrice, nil},
		{"max only", nil, &maxPrice},
		{"both", &minPrice, &maxPrice},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			query := SearchQuery{
				MinPrice: tt.minPrice,
				MaxPrice: tt.maxPrice,
			}
			result := buildSearchQuery(query)

			q := result["query"].(map[string]any)
			boolQuery := q["bool"].(map[string]any)
			filter := boolQuery["filter"].([]map[string]any)

			if len(filter) != 1 {
				t.Errorf("expected 1 filter clause, got %d", len(filter))
			}

			rangeQuery := filter[0]["range"].(map[string]any)
			hourlyRate := rangeQuery["hourly_rate"].(map[string]any)

			if tt.minPrice != nil {
				if hourlyRate["gte"] != *tt.minPrice {
					t.Errorf("expected gte %v, got %v", *tt.minPrice, hourlyRate["gte"])
				}
			}
			if tt.maxPrice != nil {
				if hourlyRate["lte"] != *tt.maxPrice {
					t.Errorf("expected lte %v, got %v", *tt.maxPrice, hourlyRate["lte"])
				}
			}
		})
	}
}

func TestBuildSearchQuery_MinRating(t *testing.T) {
	minRating := 4.0
	query := SearchQuery{
		MinRating: &minRating,
	}
	result := buildSearchQuery(query)

	q := result["query"].(map[string]any)
	boolQuery := q["bool"].(map[string]any)
	filter := boolQuery["filter"].([]map[string]any)

	if len(filter) != 1 {
		t.Errorf("expected 1 filter clause, got %d", len(filter))
	}

	rangeQuery := filter[0]["range"].(map[string]any)
	rating := rangeQuery["rating"].(map[string]any)

	if rating["gte"] != 4.0 {
		t.Errorf("expected gte 4.0, got %v", rating["gte"])
	}
}

func TestBuildSearchQuery_Format(t *testing.T) {
	query := SearchQuery{
		Format: "online",
	}
	result := buildSearchQuery(query)

	q := result["query"].(map[string]any)
	boolQuery := q["bool"].(map[string]any)
	filter := boolQuery["filter"].([]map[string]any)

	if len(filter) != 1 {
		t.Errorf("expected 1 filter clause, got %d", len(filter))
	}

	term := filter[0]["term"].(map[string]any)
	if term["formats"] != "online" {
		t.Errorf("expected format 'online', got %v", term["formats"])
	}
}

func TestBuildSearchQuery_Location(t *testing.T) {
	query := SearchQuery{
		Location: "Moscow",
	}
	result := buildSearchQuery(query)

	q := result["query"].(map[string]any)
	boolQuery := q["bool"].(map[string]any)
	filter := boolQuery["filter"].([]map[string]any)

	if len(filter) != 1 {
		t.Errorf("expected 1 filter clause, got %d", len(filter))
	}

	term := filter[0]["term"].(map[string]any)
	if term["location"] != "Moscow" {
		t.Errorf("expected location 'Moscow', got %v", term["location"])
	}
}

func TestBuildSearchQuery_Pagination(t *testing.T) {
	tests := []struct {
		name         string
		limit        int
		offset       int
		expectedSize int
		expectedFrom int
	}{
		{"default limit", 0, 0, 20, 0},
		{"custom limit", 50, 0, 50, 0},
		{"with offset", 10, 30, 10, 30},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			query := SearchQuery{
				Limit:  tt.limit,
				Offset: tt.offset,
			}
			result := buildSearchQuery(query)

			if result["size"] != tt.expectedSize {
				t.Errorf("expected size %d, got %v", tt.expectedSize, result["size"])
			}
			if result["from"] != tt.expectedFrom {
				t.Errorf("expected from %d, got %v", tt.expectedFrom, result["from"])
			}
		})
	}
}
