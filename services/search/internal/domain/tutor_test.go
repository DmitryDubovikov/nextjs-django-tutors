package domain

import (
	"encoding/json"
	"testing"
	"time"
)

func TestTutor_JSONSerialization(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)

	tests := []struct {
		name  string
		tutor Tutor
	}{
		{
			name: "complete tutor",
			tutor: Tutor{
				ID:           1,
				Slug:         "ivan-petrov",
				FullName:     "Иван Петров",
				AvatarURL:    "https://example.com/avatar.jpg",
				Headline:     "Репетитор по математике",
				Bio:          "Опытный преподаватель с 10-летним стажем",
				Subjects:     []string{"math", "physics"},
				HourlyRate:   1500.50,
				Rating:       4.8,
				ReviewsCount: 42,
				IsVerified:   true,
				Location:     "Moscow",
				Formats:      []string{"online", "offline"},
				CreatedAt:    now,
				UpdatedAt:    now,
			},
		},
		{
			name: "minimal tutor",
			tutor: Tutor{
				ID:       2,
				Slug:     "test-user",
				FullName: "Test User",
				Subjects: []string{},
				Formats:  []string{},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := json.Marshal(tt.tutor)
			if err != nil {
				t.Fatalf("failed to marshal: %v", err)
			}

			var decoded Tutor
			err = json.Unmarshal(data, &decoded)
			if err != nil {
				t.Fatalf("failed to unmarshal: %v", err)
			}

			if decoded.ID != tt.tutor.ID {
				t.Errorf("ID mismatch: got %d, want %d", decoded.ID, tt.tutor.ID)
			}
			if decoded.FullName != tt.tutor.FullName {
				t.Errorf("FullName mismatch: got %s, want %s", decoded.FullName, tt.tutor.FullName)
			}
		})
	}
}

func TestTutor_JSONFields(t *testing.T) {
	tutor := Tutor{
		ID:           1,
		Slug:         "test-name",
		FullName:     "Test Name",
		AvatarURL:    "https://example.com/avatar.jpg",
		Headline:     "Test Headline",
		Bio:          "Test Bio",
		Subjects:     []string{"math"},
		HourlyRate:   1000,
		Rating:       4.5,
		ReviewsCount: 10,
		IsVerified:   true,
		Location:     "Moscow",
		Formats:      []string{"online"},
		CreatedAt:    time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		UpdatedAt:    time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC),
	}

	data, err := json.Marshal(tutor)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var result map[string]any
	err = json.Unmarshal(data, &result)
	if err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	expectedFields := []string{
		"id", "slug", "full_name", "avatar_url", "headline", "bio", "subjects",
		"hourly_rate", "rating", "reviews_count", "is_verified",
		"location", "formats", "created_at", "updated_at",
	}

	for _, field := range expectedFields {
		if _, ok := result[field]; !ok {
			t.Errorf("missing field: %s", field)
		}
	}
}

func TestTutor_UnicodeText(t *testing.T) {
	tutor := Tutor{
		ID:       1,
		FullName: "José García López",
		Headline: "Mathematics Teacher",
		Bio:      "Over 15 years of experience. SAT and AP preparation.",
		Location: "New York",
	}

	data, err := json.Marshal(tutor)
	if err != nil {
		t.Fatalf("failed to marshal: %v", err)
	}

	var decoded Tutor
	err = json.Unmarshal(data, &decoded)
	if err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}

	if decoded.FullName != tutor.FullName {
		t.Errorf("FullName mismatch: got %s, want %s", decoded.FullName, tutor.FullName)
	}
	if decoded.Headline != tutor.Headline {
		t.Errorf("Headline mismatch: got %s, want %s", decoded.Headline, tutor.Headline)
	}
}
