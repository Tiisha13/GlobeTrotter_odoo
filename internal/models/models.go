// Package models defines the data structures used throughout the GlobeTrotter application.
// It includes database models, request/response DTOs, and validation tags for data integrity.
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// User represents a user in the system with authentication and profile information.
// This corresponds to the "users" collection in MongoDB.
type User struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Name         string             `json:"name" bson:"name" validate:"required,min=2,max=100"`
	Email        string             `json:"email" bson:"email" validate:"required,email"`
	PasswordHash string             `json:"-" bson:"password_hash"` // Never exposed in JSON
	AvatarPath   string             `json:"avatar_path" bson:"avatar_path"`
	Preferences  UserPreferences    `json:"preferences" bson:"preferences"`
	CreatedAt    time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt    time.Time          `json:"updated_at" bson:"updated_at"`
}

// UserPreferences contains user-specific settings and preferences.
type UserPreferences struct {
	Language string `json:"language" bson:"language" validate:"required"`
	Currency string `json:"currency" bson:"currency" validate:"required"`
	Theme    string `json:"theme" bson:"theme"`
}

// Trip represents a travel itinerary created by a user.
// This corresponds to the "trips" collection in MongoDB.
type Trip struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	OwnerID       primitive.ObjectID `json:"owner_id" bson:"owner_id"`
	Name          string             `json:"name" bson:"name" validate:"required,min=1,max=200"`
	StartDate     time.Time          `json:"start_date" bson:"start_date" validate:"required"`
	EndDate       time.Time          `json:"end_date" bson:"end_date" validate:"required"`
	Description   string             `json:"description" bson:"description"`
	CoverPhotoURL string             `json:"cover_photo_url" bson:"cover_photo_url"`
	Privacy       string             `json:"privacy" bson:"privacy" validate:"required,oneof=public private shared"`
	CreatedAt     time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt     time.Time          `json:"updated_at" bson:"updated_at"`
}

// Stop represents the stops collection
type Stop struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TripID        primitive.ObjectID `json:"trip_id" bson:"trip_id"`
	CityID        primitive.ObjectID `json:"city_id" bson:"city_id"`
	ArrivalDate   time.Time          `json:"arrival_date" bson:"arrival_date"`
	DepartureDate time.Time          `json:"departure_date" bson:"departure_date"`
	Order         int                `json:"order" bson:"order"`
	Notes         string             `json:"notes" bson:"notes"`
}

// City represents the cities collection
type City struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Name       string             `json:"name" bson:"name" validate:"required"`
	Country    string             `json:"country" bson:"country" validate:"required"`
	Region     string             `json:"region" bson:"region"`
	CostIndex  float64            `json:"cost_index" bson:"cost_index"`
	Popularity int                `json:"popularity" bson:"popularity"`
	Geo        GeoLocation        `json:"geo" bson:"geo"`
}

type GeoLocation struct {
	Latitude  float64 `json:"lat" bson:"lat"`
	Longitude float64 `json:"lon" bson:"lon"`
}

// Activity represents the activities collection
type Activity struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	CityID        primitive.ObjectID `json:"city_id" bson:"city_id"`
	Title         string             `json:"title" bson:"title" validate:"required"`
	Type          string             `json:"type" bson:"type" validate:"required"`
	Description   string             `json:"description" bson:"description"`
	DurationMins  int                `json:"duration_mins" bson:"duration_mins"`
	PriceEstimate float64            `json:"price_estimate" bson:"price_estimate"`
	Images        []string           `json:"images" bson:"images"`
	Tags          []string           `json:"tags" bson:"tags"`
	Popularity    int                `json:"popularity" bson:"popularity"`
}

// ItineraryItem represents the itinerary_items collection
type ItineraryItem struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	StopID     primitive.ObjectID `json:"stop_id" bson:"stop_id"`
	Day        int                `json:"day" bson:"day"`
	StartTime  string             `json:"start_time" bson:"start_time"`
	EndTime    string             `json:"end_time" bson:"end_time"`
	ActivityID primitive.ObjectID `json:"activity_id" bson:"activity_id"`
	Cost       float64            `json:"cost" bson:"cost"`
	Notes      string             `json:"notes" bson:"notes"`
	Order      int                `json:"order" bson:"order"`
}

// SharedTrip represents the shared_trips collection
type SharedTrip struct {
	TripID     primitive.ObjectID `json:"trip_id" bson:"trip_id"`
	ShareToken string             `json:"share_token" bson:"share_token"`
	ExpiresAt  time.Time          `json:"expires_at" bson:"expires_at"`
	CreatedAt  time.Time          `json:"created_at" bson:"created_at"`
}

// Request/Response DTOs
// === REQUEST/RESPONSE DTOs ===

// SignupRequest represents the payload for user registration.
type SignupRequest struct {
	Name     string `json:"name" validate:"required,min=2,max=100"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

// LoginRequest represents the payload for user authentication.
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// AuthResponse represents the response after successful authentication.
// Contains access token along with user information.
type AuthResponse struct {
	AccessToken string `json:"access_token"`
	User        User   `json:"user"`
}

type CreateTripRequest struct {
	Name          string    `json:"name" validate:"required,min=1,max=200"`
	StartDate     time.Time `json:"start_date" validate:"required"`
	EndDate       time.Time `json:"end_date" validate:"required"`
	Description   string    `json:"description"`
	CoverPhotoURL string    `json:"cover_photo_url"`
	Privacy       string    `json:"privacy" validate:"required,oneof=public private shared"`
}

type UpdateTripRequest struct {
	Name          *string    `json:"name,omitempty" validate:"omitempty,min=1,max=200"`
	StartDate     *time.Time `json:"start_date,omitempty"`
	EndDate       *time.Time `json:"end_date,omitempty"`
	Description   *string    `json:"description,omitempty"`
	CoverPhotoURL *string    `json:"cover_photo_url,omitempty"`
	Privacy       *string    `json:"privacy,omitempty" validate:"omitempty,oneof=public private shared"`
}

type CreateStopRequest struct {
	CityID        primitive.ObjectID `json:"city_id" validate:"required"`
	ArrivalDate   time.Time          `json:"arrival_date" validate:"required"`
	DepartureDate time.Time          `json:"departure_date" validate:"required"`
	Order         int                `json:"order"`
	Notes         string             `json:"notes"`
}

type UpdateStopRequest struct {
	CityID        *primitive.ObjectID `json:"city_id,omitempty"`
	ArrivalDate   *time.Time          `json:"arrival_date,omitempty"`
	DepartureDate *time.Time          `json:"departure_date,omitempty"`
	Order         *int                `json:"order,omitempty"`
	Notes         *string             `json:"notes,omitempty"`
}

type CreateItineraryItemRequest struct {
	Day        int                `json:"day" validate:"required,min=1"`
	StartTime  string             `json:"start_time" validate:"required"`
	EndTime    string             `json:"end_time" validate:"required"`
	ActivityID primitive.ObjectID `json:"activity_id" validate:"required"`
	Cost       float64            `json:"cost"`
	Notes      string             `json:"notes"`
	Order      int                `json:"order"`
}

type UpdateItineraryItemRequest struct {
	Day        *int                `json:"day,omitempty" validate:"omitempty,min=1"`
	StartTime  *string             `json:"start_time,omitempty"`
	EndTime    *string             `json:"end_time,omitempty"`
	ActivityID *primitive.ObjectID `json:"activity_id,omitempty"`
	Cost       *float64            `json:"cost,omitempty"`
	Notes      *string             `json:"notes,omitempty"`
	Order      *int                `json:"order,omitempty"`
}

// Response models
type TripWithDetails struct {
	Trip
	Owner      User `json:"owner"`
	StopsCount int  `json:"stops_count"`
}

type StopWithDetails struct {
	Stop
	City                City `json:"city"`
	ItineraryItemsCount int  `json:"itinerary_items_count"`
}

type BudgetSummary struct {
	TotalBudget     float64            `json:"total_budget"`
	SpentAmount     float64            `json:"spent_amount"`
	RemainingBudget float64            `json:"remaining_budget"`
	ByCategory      map[string]float64 `json:"by_category"`
	ByStop          map[string]float64 `json:"by_stop"`
}

type CalendarDay struct {
	Date  string                      `json:"date"`
	Items []ItineraryItemWithActivity `json:"items"`
}

type ItineraryItemWithActivity struct {
	ItineraryItem
	Activity Activity `json:"activity"`
}

// === API RESPONSE STRUCTURES ===

// APIResponse is the standard response format for all API endpoints.
// It provides a consistent structure for success/error responses.
type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// PaginatedResponse wraps paginated data with metadata about the pagination state.
// Used for endpoints that return large datasets like trips, users, etc.
type PaginatedResponse struct {
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalItems int64       `json:"total_items"`
	TotalPages int         `json:"total_pages"`
	HasNext    bool        `json:"has_next"`
	HasPrev    bool        `json:"has_prev"`
	Data       interface{} `json:"data"`
}
