package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Stop struct {
	BaseModel     `bson:",inline"`
	TripID        primitive.ObjectID `json:"trip_id" bson:"trip_id" validate:"required"`
	City          string             `json:"city" bson:"city" validate:"required"`
	Country       string             `json:"country" bson:"country" validate:"required"`
	Lat           float64            `json:"lat" bson:"lat" validate:"required"`
	Lng           float64            `json:"lng" bson:"lng" validate:"required"`
	Location      Location           `json:"location" bson:"location"`
	GooglePlaceID string             `json:"google_place_id" bson:"google_place_id"`
	ArrivalDate   time.Time          `json:"arrival_date" bson:"arrival_date" validate:"required"`
	DepartureDate time.Time          `json:"departure_date" bson:"departure_date" validate:"required"`
	Position      int                `json:"position" bson:"position" validate:"required"`
	Notes         string             `json:"notes" bson:"notes"`
}

type CreateStopRequest struct {
	City          string    `json:"city" validate:"required"`
	Country       string    `json:"country" validate:"required"`
	Lat           float64   `json:"lat" validate:"required"`
	Lng           float64   `json:"lng" validate:"required"`
	GooglePlaceID string    `json:"google_place_id"`
	ArrivalDate   time.Time `json:"arrival_date" validate:"required"`
	DepartureDate time.Time `json:"departure_date" validate:"required"`
	Position      int       `json:"position" validate:"required"`
	Notes         string    `json:"notes"`
}

type UpdateStopRequest struct {
	City          *string    `json:"city,omitempty"`
	Country       *string    `json:"country,omitempty"`
	Lat           *float64   `json:"lat,omitempty"`
	Lng           *float64   `json:"lng,omitempty"`
	GooglePlaceID *string    `json:"google_place_id,omitempty"`
	ArrivalDate   *time.Time `json:"arrival_date,omitempty"`
	DepartureDate *time.Time `json:"departure_date,omitempty"`
	Position      *int       `json:"position,omitempty"`
	Notes         *string    `json:"notes,omitempty"`
}

type StopResponse struct {
	ID              primitive.ObjectID `json:"id"`
	TripID          primitive.ObjectID `json:"trip_id"`
	City            string             `json:"city"`
	Country         string             `json:"country"`
	Lat             float64            `json:"lat"`
	Lng             float64            `json:"lng"`
	GooglePlaceID   string             `json:"google_place_id"`
	ArrivalDate     time.Time          `json:"arrival_date"`
	DepartureDate   time.Time          `json:"departure_date"`
	Position        int                `json:"position"`
	Notes           string             `json:"notes"`
	CreatedAt       time.Time          `json:"created_at"`
	UpdatedAt       time.Time          `json:"updated_at"`
	ActivitiesCount int                `json:"activities_count,omitempty"`
	Activities      []ActivityResponse `json:"activities,omitempty"`
}

func (s *Stop) ToResponse() StopResponse {
	return StopResponse{
		ID:            s.ID,
		TripID:        s.TripID,
		City:          s.City,
		Country:       s.Country,
		Lat:           s.Lat,
		Lng:           s.Lng,
		GooglePlaceID: s.GooglePlaceID,
		ArrivalDate:   s.ArrivalDate,
		DepartureDate: s.DepartureDate,
		Position:      s.Position,
		Notes:         s.Notes,
		CreatedAt:     s.CreatedAt,
		UpdatedAt:     s.UpdatedAt,
	}
}

// Helper method to update location field when lat/lng changes
func (s *Stop) UpdateLocation() {
	s.Location = NewLocation(s.Lat, s.Lng)
}
