package opensearch

import "testing"

func TestIndexMapping_Structure(t *testing.T) {
	if _, ok := indexMapping["settings"]; !ok {
		t.Error("missing settings in index mapping")
	}
	if _, ok := indexMapping["mappings"]; !ok {
		t.Error("missing mappings in index mapping")
	}

	settings := indexMapping["settings"].(map[string]any)
	if settings["number_of_shards"] != 1 {
		t.Errorf("expected 1 shard, got %v", settings["number_of_shards"])
	}
	if settings["number_of_replicas"] != 0 {
		t.Errorf("expected 0 replicas, got %v", settings["number_of_replicas"])
	}
}

func TestIndexMapping_EnglishAnalyzer(t *testing.T) {
	settings := indexMapping["settings"].(map[string]any)
	analysis := settings["analysis"].(map[string]any)

	analyzer := analysis["analyzer"].(map[string]any)
	englishAnalyzer := analyzer["english_analyzer"].(map[string]any)

	if englishAnalyzer["type"] != "custom" {
		t.Errorf("expected custom analyzer type, got %v", englishAnalyzer["type"])
	}
	if englishAnalyzer["tokenizer"] != "standard" {
		t.Errorf("expected standard tokenizer, got %v", englishAnalyzer["tokenizer"])
	}

	filter := analysis["filter"].(map[string]any)
	englishStemmer := filter["english_stemmer"].(map[string]any)

	if englishStemmer["type"] != "stemmer" {
		t.Errorf("expected stemmer type, got %v", englishStemmer["type"])
	}
	if englishStemmer["language"] != "english" {
		t.Errorf("expected english language, got %v", englishStemmer["language"])
	}
}

func TestIndexMapping_Properties(t *testing.T) {
	mappings := indexMapping["mappings"].(map[string]any)
	properties := mappings["properties"].(map[string]any)

	tests := []struct {
		field        string
		expectedType string
	}{
		{"id", "integer"},
		{"full_name", "text"},
		{"headline", "text"},
		{"bio", "text"},
		{"subjects", "keyword"},
		{"hourly_rate", "float"},
		{"rating", "float"},
		{"reviews_count", "integer"},
		{"is_verified", "boolean"},
		{"location", "keyword"},
		{"formats", "keyword"},
		{"created_at", "date"},
		{"updated_at", "date"},
	}

	for _, tt := range tests {
		t.Run(tt.field, func(t *testing.T) {
			fieldProp, ok := properties[tt.field]
			if !ok {
				t.Errorf("missing field: %s", tt.field)
				return
			}

			fieldMapping := fieldProp.(map[string]any)
			if fieldMapping["type"] != tt.expectedType {
				t.Errorf("expected type %s, got %v", tt.expectedType, fieldMapping["type"])
			}
		})
	}
}

func TestIndexName(t *testing.T) {
	if IndexName != "tutors" {
		t.Errorf("expected index name 'tutors', got %s", IndexName)
	}
}
