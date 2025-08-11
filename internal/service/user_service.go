package service

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"globetrotter/internal/auth"
	"globetrotter/internal/cache"
	"globetrotter/internal/config"
	"globetrotter/internal/models"
	"globetrotter/internal/store"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserService struct {
	userRepo     *store.UserRepository
	authService  *auth.AuthService
	cacheService *cache.CacheService
	config       *config.Config
}

func NewUserService(
	userRepo *store.UserRepository,
	authService *auth.AuthService,
	cacheService *cache.CacheService,
	config *config.Config,
) *UserService {
	return &UserService{
		userRepo:     userRepo,
		authService:  authService,
		cacheService: cacheService,
		config:       config,
	}
}

func (s *UserService) Signup(ctx context.Context, req *models.SignupRequest) (*models.AuthResponse, error) {
	// Check if email already exists
	exists, err := s.userRepo.EmailExists(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to check email existence: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("email already exists")
	}

	// Hash password
	hashedPassword, err := s.authService.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user := &models.User{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: hashedPassword,
		Preferences: models.UserPreferences{
			Language: "en",
			Currency: "USD",
			Theme:    "light",
		},
	}

	err = s.userRepo.Create(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Generate access token
	accessToken, err := s.authService.GenerateAccessToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	return &models.AuthResponse{
		AccessToken: accessToken,
		User:        *user,
	}, nil
}

func (s *UserService) Login(ctx context.Context, req *models.LoginRequest) (*models.AuthResponse, error) {
	// Get user by email
	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		if err == store.ErrNotFound {
			return nil, fmt.Errorf("invalid credentials")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Verify password
	err = s.authService.VerifyPassword(req.Password, user.PasswordHash)
	if err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	// Generate access token
	accessToken, err := s.authService.GenerateAccessToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	return &models.AuthResponse{
		AccessToken: accessToken,
		User:        *user,
	}, nil
}

func (s *UserService) GetProfile(ctx context.Context, userID primitive.ObjectID) (*models.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user profile: %w", err)
	}

	return user, nil
}

func (s *UserService) UpdateProfile(ctx context.Context, userID primitive.ObjectID, updates bson.M) (*models.User, error) {
	err := s.userRepo.Update(ctx, userID, updates)
	if err != nil {
		return nil, fmt.Errorf("failed to update user profile: %w", err)
	}

	// Invalidate cache
	s.cacheService.InvalidateUserCache(ctx, userID.Hex())

	// Get updated user
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated user: %w", err)
	}

	return user, nil
}

func (s *UserService) DeleteProfile(ctx context.Context, userID primitive.ObjectID) error {
	// Get user for cleanup
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	// Delete avatar file if exists
	if user.AvatarPath != "" {
		avatarFullPath := filepath.Join(s.config.UploadDir, user.AvatarPath)
		os.Remove(avatarFullPath) // Ignore error
	}

	// Delete user
	err = s.userRepo.Delete(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	// Invalidate cache
	s.cacheService.InvalidateUserCache(ctx, userID.Hex())

	return nil
}

func (s *UserService) UploadAvatar(ctx context.Context, userID primitive.ObjectID, fileHeader io.Reader, filename string, size int64) (string, error) {
	// Validate file size
	if size > s.config.MaxUploadSize {
		return "", fmt.Errorf("file too large: maximum size is %d bytes", s.config.MaxUploadSize)
	}

	// Read file content for MIME type detection
	buffer := make([]byte, 512)
	n, err := fileHeader.Read(buffer)
	if err != nil && err != io.EOF {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	// Detect MIME type
	mimeType := http.DetectContentType(buffer[:n])

	// Validate MIME type
	valid := false
	for _, allowedType := range s.config.AllowedMimeTypes {
		if mimeType == allowedType {
			valid = true
			break
		}
	}

	if !valid {
		return "", fmt.Errorf("unsupported file type: %s", mimeType)
	}

	// Get file extension
	ext := ""
	switch mimeType {
	case "image/jpeg":
		ext = ".jpg"
	case "image/png":
		ext = ".png"
	case "image/webp":
		ext = ".webp"
	}

	// Generate filename
	timestamp := time.Now().Unix()
	newFilename := fmt.Sprintf("%s_%d%s", userID.Hex(), timestamp, ext)

	// Ensure upload directory exists
	profilePicsDir := filepath.Join(s.config.UploadDir, "profile_pics")
	err = os.MkdirAll(profilePicsDir, 0755)
	if err != nil {
		return "", fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Create file
	filePath := filepath.Join(profilePicsDir, newFilename)
	file, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	// Write initial buffer
	_, err = file.Write(buffer[:n])
	if err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	// Copy remaining content
	_, err = io.Copy(file, fileHeader)
	if err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	// Get current user to delete old avatar
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		os.Remove(filePath) // Clean up new file
		return "", fmt.Errorf("failed to get user: %w", err)
	}

	// Delete old avatar if exists
	if user.AvatarPath != "" {
		oldAvatarPath := filepath.Join(s.config.UploadDir, user.AvatarPath)
		os.Remove(oldAvatarPath) // Ignore error
	}

	// Update user with new avatar path (use forward slashes for web URLs)
	avatarPath := fmt.Sprintf("profile_pics/%s", newFilename)
	err = s.userRepo.Update(ctx, userID, bson.M{"avatar_path": avatarPath})
	if err != nil {
		os.Remove(filePath) // Clean up new file
		return "", fmt.Errorf("failed to update user avatar: %w", err)
	}

	// Invalidate user cache
	s.cacheService.InvalidateUserCache(ctx, userID.Hex())

	// Return avatar URL
	avatarURL := fmt.Sprintf("/static/%s", avatarPath)
	return avatarURL, nil
}
