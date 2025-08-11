package services

import (
	"context"
	"errors"
	"fmt"

	"globetrotter/models"
	"globetrotter/repositories"
	"globetrotter/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type UserService struct {
	userRepo *repositories.UserRepository
}

func NewUserService() *UserService {
	return &UserService{
		userRepo: repositories.NewUserRepository(),
	}
}

func (s *UserService) CreateUser(ctx context.Context, req *models.CreateUserRequest) (*models.User, error) {
	// Check if user already exists
	exists, err := s.userRepo.Exists(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to check user existence: %w", err)
	}
	if exists {
		return nil, errors.New("user with this email already exists")
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user := &models.User{
		Email:     req.Email,
		Password:  hashedPassword,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Preferences: models.UserPreferences{
			Language: "en",
			Currency: "USD",
		},
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

func (s *UserService) LoginUser(ctx context.Context, req *models.LoginRequest) (*models.LoginResponse, error) {
	// Get user by email
	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("invalid credentials")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Check password
	if !utils.CheckPasswordHash(req.Password, user.Password) {
		return nil, errors.New("invalid credentials")
	}

	// Generate JWT token
	token, err := utils.GenerateJWT(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	// Update last login
	if err := s.userRepo.UpdateLastLogin(ctx, user.ID); err != nil {
		// Log but don't fail the login
		fmt.Printf("Failed to update last login for user %s: %v\n", user.ID.Hex(), err)
	}

	return &models.LoginResponse{
		Token: token,
		User:  user.ToResponse(),
	}, nil
}

func (s *UserService) GetUserProfile(ctx context.Context, userID primitive.ObjectID) (*models.UserResponse, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	response := user.ToResponse()
	return &response, nil
}

func (s *UserService) UpdateUserProfile(ctx context.Context, userID primitive.ObjectID, req *models.UpdateUserRequest) (*models.UserResponse, error) {
	// Build update document
	update := bson.M{}

	if req.FirstName != nil {
		update["first_name"] = *req.FirstName
	}
	if req.LastName != nil {
		update["last_name"] = *req.LastName
	}
	if req.AvatarURL != nil {
		update["avatar_url"] = *req.AvatarURL
	}
	if req.Bio != nil {
		update["bio"] = *req.Bio
	}
	if req.Preferences != nil {
		update["preferences"] = *req.Preferences
	}

	if len(update) == 0 {
		return nil, errors.New("no fields to update")
	}

	// Update user
	if err := s.userRepo.Update(ctx, userID, update); err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	// Return updated user
	return s.GetUserProfile(ctx, userID)
}

func (s *UserService) DeleteUser(ctx context.Context, userID primitive.ObjectID) error {
	// Soft delete user
	if err := s.userRepo.Delete(ctx, userID); err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	return nil
}

func (s *UserService) ListUsers(ctx context.Context, page, limit int) (*models.PaginationResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	users, total, err := s.userRepo.List(ctx, page, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}

	// Convert to response format
	userResponses := make([]models.UserResponse, len(users))
	for i, user := range users {
		userResponses[i] = user.ToResponse()
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	return &models.PaginationResponse{
		Page:       page,
		Limit:      limit,
		TotalItems: total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
		Data:       userResponses,
	}, nil
}
