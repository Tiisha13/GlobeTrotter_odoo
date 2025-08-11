package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Trip struct {
	BaseModel   `bson:",inline"`
	UserID      primitive.ObjectID `json:"user_id" bson:"user_id" validate:"required"`
	Name        string             `json:"name" bson:"name" validate:"required"`
	Description string             `json:"description" bson:"description"`
	StartDate   time.Time          `json:"start_date" bson:"start_date" validate:"required"`
	EndDate     time.Time          `json:"end_date" bson:"end_date" validate:"required"`
	IsPublic    bool               `json:"is_public" bson:"is_public"`
	CoverImage  string             `json:"cover_image" bson:"cover_image"`
	TotalBudget float64            `json:"total_budget" bson:"total_budget"`
	Currency    string             `json:"currency" bson:"currency"`
	ShareToken  string             `json:"share_token,omitempty" bson:"share_token,omitempty"`
	ViewCount   int64              `json:"view_count" bson:"view_count"`
}

type CreateTripRequest struct {
	Name        string    `json:"name" validate:"required"`
	Description string    `json:"description"`
	StartDate   time.Time `json:"start_date" validate:"required"`
	EndDate     time.Time `json:"end_date" validate:"required"`
	IsPublic    bool      `json:"is_public"`
	CoverImage  string    `json:"cover_image"`
	TotalBudget float64   `json:"total_budget"`
	Currency    string    `json:"currency"`
}

type UpdateTripRequest struct {
	Name        *string    `json:"name,omitempty"`
	Description *string    `json:"description,omitempty"`
	StartDate   *time.Time `json:"start_date,omitempty"`
	EndDate     *time.Time `json:"end_date,omitempty"`
	IsPublic    *bool      `json:"is_public,omitempty"`
	CoverImage  *string    `json:"cover_image,omitempty"`
	TotalBudget *float64   `json:"total_budget,omitempty"`
	Currency    *string    `json:"currency,omitempty"`
}

type TripResponse struct {
	ID          primitive.ObjectID `json:"id"`
	UserID      primitive.ObjectID `json:"user_id"`
	Name        string             `json:"name"`
	Description string             `json:"description"`
	StartDate   time.Time          `json:"start_date"`
	EndDate     time.Time          `json:"end_date"`
	IsPublic    bool               `json:"is_public"`
	CoverImage  string             `json:"cover_image"`
	TotalBudget float64            `json:"total_budget"`
	Currency    string             `json:"currency"`
	ShareToken  string             `json:"share_token,omitempty"`
	ViewCount   int64              `json:"view_count"`
	CreatedAt   time.Time          `json:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"`
	StopsCount  int                `json:"stops_count,omitempty"`
	User        *UserResponse      `json:"user,omitempty"`
}

type PublicTripResponse struct {
	ID          primitive.ObjectID `json:"id"`
	Name        string             `json:"name"`
	Description string             `json:"description"`
	StartDate   time.Time          `json:"start_date"`
	EndDate     time.Time          `json:"end_date"`
	CoverImage  string             `json:"cover_image"`
	ViewCount   int64              `json:"view_count"`
	CreatedAt   time.Time          `json:"created_at"`
	StopsCount  int                `json:"stops_count,omitempty"`
	User        *UserResponse      `json:"user,omitempty"`
}

func (t *Trip) ToResponse() TripResponse {
	return TripResponse{
		ID:          t.ID,
		UserID:      t.UserID,
		Name:        t.Name,
		Description: t.Description,
		StartDate:   t.StartDate,
		EndDate:     t.EndDate,
		IsPublic:    t.IsPublic,
		CoverImage:  t.CoverImage,
		TotalBudget: t.TotalBudget,
		Currency:    t.Currency,
		ShareToken:  t.ShareToken,
		ViewCount:   t.ViewCount,
		CreatedAt:   t.CreatedAt,
		UpdatedAt:   t.UpdatedAt,
	}
}

func (t *Trip) ToPublicResponse() PublicTripResponse {
	return PublicTripResponse{
		ID:          t.ID,
		Name:        t.Name,
		Description: t.Description,
		StartDate:   t.StartDate,
		EndDate:     t.EndDate,
		CoverImage:  t.CoverImage,
		ViewCount:   t.ViewCount,
		CreatedAt:   t.CreatedAt,
	}
}
