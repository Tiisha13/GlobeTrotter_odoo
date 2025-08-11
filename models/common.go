package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type BaseModel struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}

type PaginationQuery struct {
	Page  int `query:"page"`
	Limit int `query:"limit"`
}

type PaginationResponse struct {
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalItems int64       `json:"total_items"`
	TotalPages int         `json:"total_pages"`
	HasNext    bool        `json:"has_next"`
	HasPrev    bool        `json:"has_prev"`
	Data       interface{} `json:"data"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

type Location struct {
	Type        string    `json:"type" bson:"type"`
	Coordinates []float64 `json:"coordinates" bson:"coordinates"` // [longitude, latitude]
}

func NewLocation(lat, lng float64) Location {
	return Location{
		Type:        "Point",
		Coordinates: []float64{lng, lat},
	}
}

func (l Location) Latitude() float64 {
	if len(l.Coordinates) >= 2 {
		return l.Coordinates[1]
	}
	return 0
}

func (l Location) Longitude() float64 {
	if len(l.Coordinates) >= 1 {
		return l.Coordinates[0]
	}
	return 0
}
