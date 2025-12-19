package domain

import "time"

type Tutor struct {
	ID           int64     `json:"id"`
	Slug         string    `json:"slug"`
	FullName     string    `json:"full_name"`
	AvatarURL    string    `json:"avatar_url"`
	Headline     string    `json:"headline"`
	Bio          string    `json:"bio"`
	Subjects     []string  `json:"subjects"`
	HourlyRate   float64   `json:"hourly_rate"`
	Rating       float64   `json:"rating"`
	ReviewsCount int       `json:"reviews_count"`
	IsVerified   bool      `json:"is_verified"`
	Location     string    `json:"location"`
	Formats      []string  `json:"formats"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
