package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ActivityCategory string

const (
	ActivityCategoryFood          ActivityCategory = "food"
	ActivityCategoryTransport     ActivityCategory = "transport"
	ActivityCategoryAccommodation ActivityCategory = "accommodation"
	ActivityCategorySightseeing   ActivityCategory = "sightseeing"
	ActivityCategoryEntertainment ActivityCategory = "entertainment"
	ActivityCategoryShopping      ActivityCategory = "shopping"
	ActivityCategoryOther         ActivityCategory = "other"
)

type Activity struct {
	BaseModel   `bson:",inline"`
	StopID      primitive.ObjectID `json:"stop_id" bson:"stop_id" validate:"required"`
	Title       string             `json:"title" bson:"title" validate:"required"`
	Description string             `json:"description" bson:"description"`
	Cost        float64            `json:"cost" bson:"cost"`
	Currency    string             `json:"currency" bson:"currency"`
	DayOffset   int                `json:"day_offset" bson:"day_offset"` // Day relative to stop arrival (0 = arrival day)
	StartTime   string             `json:"start_time" bson:"start_time"` // Format: "HH:MM"
	EndTime     string             `json:"end_time" bson:"end_time"`     // Format: "HH:MM"
	Category    ActivityCategory   `json:"category" bson:"category"`
	Notes       string             `json:"notes" bson:"notes"`
	BookingURL  string             `json:"booking_url" bson:"booking_url"`
}

type CreateActivityRequest struct {
	Title       string           `json:"title" validate:"required"`
	Description string           `json:"description"`
	Cost        float64          `json:"cost"`
	Currency    string           `json:"currency"`
	DayOffset   int              `json:"day_offset"`
	StartTime   string           `json:"start_time"`
	EndTime     string           `json:"end_time"`
	Category    ActivityCategory `json:"category"`
	Notes       string           `json:"notes"`
	BookingURL  string           `json:"booking_url"`
}

type UpdateActivityRequest struct {
	Title       *string           `json:"title,omitempty"`
	Description *string           `json:"description,omitempty"`
	Cost        *float64          `json:"cost,omitempty"`
	Currency    *string           `json:"currency,omitempty"`
	DayOffset   *int              `json:"day_offset,omitempty"`
	StartTime   *string           `json:"start_time,omitempty"`
	EndTime     *string           `json:"end_time,omitempty"`
	Category    *ActivityCategory `json:"category,omitempty"`
	Notes       *string           `json:"notes,omitempty"`
	BookingURL  *string           `json:"booking_url,omitempty"`
}

type ActivityResponse struct {
	ID          primitive.ObjectID `json:"id"`
	StopID      primitive.ObjectID `json:"stop_id"`
	Title       string             `json:"title"`
	Description string             `json:"description"`
	Cost        float64            `json:"cost"`
	Currency    string             `json:"currency"`
	DayOffset   int                `json:"day_offset"`
	StartTime   string             `json:"start_time"`
	EndTime     string             `json:"end_time"`
	Category    ActivityCategory   `json:"category"`
	Notes       string             `json:"notes"`
	BookingURL  string             `json:"booking_url"`
	CreatedAt   time.Time          `json:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"`
}

func (a *Activity) ToResponse() ActivityResponse {
	return ActivityResponse{
		ID:          a.ID,
		StopID:      a.StopID,
		Title:       a.Title,
		Description: a.Description,
		Cost:        a.Cost,
		Currency:    a.Currency,
		DayOffset:   a.DayOffset,
		StartTime:   a.StartTime,
		EndTime:     a.EndTime,
		Category:    a.Category,
		Notes:       a.Notes,
		BookingURL:  a.BookingURL,
		CreatedAt:   a.CreatedAt,
		UpdatedAt:   a.UpdatedAt,
	}
}
