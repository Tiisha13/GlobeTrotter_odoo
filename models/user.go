package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserRole string

const (
	UserRoleUser  UserRole = "user"
	UserRoleAdmin UserRole = "admin"
)

type UserPreferences struct {
	Language string `json:"language" bson:"language"`
	Currency string `json:"currency" bson:"currency"`
}

type User struct {
	BaseModel   `bson:",inline"`
	Email       string          `json:"email" bson:"email" validate:"required,email"`
	Password    string          `json:"-" bson:"password" validate:"required,min=6"`
	FirstName   string          `json:"first_name" bson:"first_name" validate:"required"`
	LastName    string          `json:"last_name" bson:"last_name" validate:"required"`
	Role        UserRole        `json:"role" bson:"role"`
	AvatarURL   string          `json:"avatar_url" bson:"avatar_url"`
	Bio         string          `json:"bio" bson:"bio"`
	Preferences UserPreferences `json:"preferences" bson:"preferences"`
	IsActive    bool            `json:"is_active" bson:"is_active"`
	LastLoginAt *time.Time      `json:"last_login_at" bson:"last_login_at"`
}

type CreateUserRequest struct {
	Email     string `json:"email" validate:"required,email"`
	Password  string `json:"password" validate:"required,min=6"`
	FirstName string `json:"first_name" validate:"required"`
	LastName  string `json:"last_name" validate:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type UpdateUserRequest struct {
	FirstName   *string          `json:"first_name,omitempty"`
	LastName    *string          `json:"last_name,omitempty"`
	AvatarURL   *string          `json:"avatar_url,omitempty"`
	Bio         *string          `json:"bio,omitempty"`
	Preferences *UserPreferences `json:"preferences,omitempty"`
}

type UserResponse struct {
	ID          primitive.ObjectID `json:"id"`
	Email       string             `json:"email"`
	FirstName   string             `json:"first_name"`
	LastName    string             `json:"last_name"`
	Role        UserRole           `json:"role"`
	AvatarURL   string             `json:"avatar_url"`
	Bio         string             `json:"bio"`
	Preferences UserPreferences    `json:"preferences"`
	IsActive    bool               `json:"is_active"`
	CreatedAt   time.Time          `json:"created_at"`
	LastLoginAt *time.Time         `json:"last_login_at"`
}

type LoginResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:          u.ID,
		Email:       u.Email,
		FirstName:   u.FirstName,
		LastName:    u.LastName,
		Role:        u.Role,
		AvatarURL:   u.AvatarURL,
		Bio:         u.Bio,
		Preferences: u.Preferences,
		IsActive:    u.IsActive,
		CreatedAt:   u.CreatedAt,
		LastLoginAt: u.LastLoginAt,
	}
}
