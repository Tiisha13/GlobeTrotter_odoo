// Package api provides HTTP request handlers for the GlobeTrotter API.
// It implements RESTful endpoints for user management, trip planning, and related functionality.
package api

import (
	"context"

	"globetrotter/internal/middleware"
	"globetrotter/internal/models"
	"globetrotter/internal/service"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UserHandler handles HTTP requests related to user management.
// It provides endpoints for authentication, profile management, and user operations.
type UserHandler struct {
	userService *service.UserService
}

// NewUserHandler creates a new UserHandler with the provided user service.
func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

// Signup handles user registration requests.
// @Summary Register a new user
// @Description Creates a new user account with email and password
// @Tags Authentication
// @Accept json
// @Produce json
// @Param user body models.SignupRequest true "User registration data"
// @Success 201 {object} models.APIResponse{data=models.AuthResponse}
// @Failure 400 {object} models.APIResponse
// @Failure 409 {object} models.APIResponse "Email already exists"
// @Failure 500 {object} models.APIResponse
// @Router /auth/signup [post]
func (h *UserHandler) Signup(c *fiber.Ctx) error {
	var req models.SignupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	// Validate request (basic validation)
	if req.Name == "" || req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Name, email, and password are required",
		})
	}

	if len(req.Password) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Password must be at least 8 characters long",
		})
	}

	authResponse, err := h.userService.Signup(context.Background(), &req)
	if err != nil {
		if err.Error() == "email already exists" {
			return c.Status(fiber.StatusConflict).JSON(models.APIResponse{
				Success: false,
				Error:   "Email already exists",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
			Success: false,
			Error:   "Failed to create user",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(models.APIResponse{
		Success: true,
		Message: "User created successfully",
		Data:    authResponse,
	})
}

// Login handles user authentication requests.
// @Summary Authenticate user
// @Description Authenticates a user with email and password, returns JWT tokens
// @Tags Authentication
// @Accept json
// @Produce json
// @Param credentials body models.LoginRequest true "User login credentials"
// @Success 200 {object} models.APIResponse{data=models.AuthResponse}
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse "Invalid credentials"
// @Failure 500 {object} models.APIResponse
// @Router /auth/login [post]
func (h *UserHandler) Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	authResponse, err := h.userService.Login(context.Background(), &req)
	if err != nil {
		if err.Error() == "invalid credentials" {
			return c.Status(fiber.StatusUnauthorized).JSON(models.APIResponse{
				Success: false,
				Error:   "Invalid credentials",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
			Success: false,
			Error:   "Failed to authenticate user",
		})
	}

	return c.JSON(models.APIResponse{
		Success: true,
		Message: "Login successful",
		Data:    authResponse,
	})
}

// GetProfile returns the current user's profile
func (h *UserHandler) GetProfile(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	user, err := h.userService.GetProfile(context.Background(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
			Success: false,
			Error:   "Failed to get user profile",
		})
	}

	return c.JSON(models.APIResponse{
		Success: true,
		Data:    user,
	})
}

// UpdateProfile updates the current user's profile
func (h *UserHandler) UpdateProfile(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	// Convert to bson.M
	bsonUpdates := bson.M{}
	for key, value := range updates {
		// Only allow certain fields to be updated
		switch key {
		case "name", "preferences", "avatar_path":
			bsonUpdates[key] = value
		}
	}

	if len(bsonUpdates) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "No valid fields to update",
		})
	}

	user, err := h.userService.UpdateProfile(context.Background(), userID, bsonUpdates)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
			Success: false,
			Error:   "Failed to update profile",
		})
	}

	return c.JSON(models.APIResponse{
		Success: true,
		Message: "Profile updated successfully",
		Data:    user,
	})
}

// DeleteProfile deletes the current user's profile
func (h *UserHandler) DeleteProfile(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	err = h.userService.DeleteProfile(context.Background(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
			Success: false,
			Error:   "Failed to delete profile",
		})
	}

	return c.JSON(models.APIResponse{
		Success: true,
		Message: "Profile deleted successfully",
	})
}

// UploadAvatar handles profile picture upload
func (h *UserHandler) UploadAvatar(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	// Parse multipart form
	file, err := c.FormFile("avatar")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "No file uploaded",
		})
	}

	// Open file
	src, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
			Success: false,
			Error:   "Failed to open uploaded file",
		})
	}
	defer src.Close()

	// Upload avatar
	avatarURL, err := h.userService.UploadAvatar(context.Background(), userID, src, file.Filename, file.Size)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return c.JSON(models.APIResponse{
		Success: true,
		Message: "Avatar uploaded successfully",
		Data: fiber.Map{
			"avatar_url": avatarURL,
		},
	})
}

type TripHandler struct {
	tripService *service.TripService
}

func NewTripHandler(tripService *service.TripService) *TripHandler {
	return &TripHandler{
		tripService: tripService,
	}
}

// CreateTrip creates a new trip
func (h *TripHandler) CreateTrip(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	var req models.CreateTripRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	trip, err := h.tripService.CreateTrip(context.Background(), userID, &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(models.APIResponse{
		Success: true,
		Message: "Trip created successfully",
		Data:    trip,
	})
}

// GetTrips returns user's trips with pagination
func (h *TripHandler) GetTrips(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	page, limit := middleware.GetPagination(c)

	trips, total, err := h.tripService.GetUserTrips(context.Background(), userID, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
			Success: false,
			Error:   "Failed to get trips",
		})
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	response := models.PaginatedResponse{
		Page:       page,
		Limit:      limit,
		TotalItems: total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
		Data:       trips,
	}

	return c.JSON(models.APIResponse{
		Success: true,
		Data:    response,
	})
}

// GetTripByID returns a specific trip
func (h *TripHandler) GetTripByID(c *fiber.Ctx) error {
	tripIDStr := c.Params("id")
	tripID, err := primitive.ObjectIDFromHex(tripIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid trip ID",
		})
	}

	userID := middleware.GetOptionalUserID(c)

	trip, err := h.tripService.GetTrip(context.Background(), tripID, userID)
	if err != nil {
		if err.Error() == "access denied" {
			return c.Status(fiber.StatusForbidden).JSON(models.APIResponse{
				Success: false,
				Error:   "Access denied",
			})
		}
		return c.Status(fiber.StatusNotFound).JSON(models.APIResponse{
			Success: false,
			Error:   "Trip not found",
		})
	}

	return c.JSON(models.APIResponse{
		Success: true,
		Data:    trip,
	})
}

// UpdateTrip updates a trip
func (h *TripHandler) UpdateTrip(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	tripIDStr := c.Params("id")
	tripID, err := primitive.ObjectIDFromHex(tripIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid trip ID",
		})
	}

	var req models.UpdateTripRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	trip, err := h.tripService.UpdateTrip(context.Background(), tripID, userID, &req)
	if err != nil {
		if err.Error() == "access denied" {
			return c.Status(fiber.StatusForbidden).JSON(models.APIResponse{
				Success: false,
				Error:   "Access denied",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return c.JSON(models.APIResponse{
		Success: true,
		Message: "Trip updated successfully",
		Data:    trip,
	})
}

// DeleteTrip deletes a trip
func (h *TripHandler) DeleteTrip(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	tripIDStr := c.Params("id")
	tripID, err := primitive.ObjectIDFromHex(tripIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid trip ID",
		})
	}

	err = h.tripService.DeleteTrip(context.Background(), tripID, userID)
	if err != nil {
		if err.Error() == "access denied" {
			return c.Status(fiber.StatusForbidden).JSON(models.APIResponse{
				Success: false,
				Error:   "Access denied",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
			Success: false,
			Error:   "Failed to delete trip",
		})
	}

	return c.JSON(models.APIResponse{
		Success: true,
		Message: "Trip deleted successfully",
	})
}

// DuplicateTrip creates a copy of an existing trip
func (h *TripHandler) DuplicateTrip(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	tripIDStr := c.Params("id")
	tripID, err := primitive.ObjectIDFromHex(tripIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid trip ID",
		})
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Trip name is required",
		})
	}

	trip, err := h.tripService.DuplicateTrip(context.Background(), tripID, userID, req.Name)
	if err != nil {
		if err.Error() == "access denied" {
			return c.Status(fiber.StatusForbidden).JSON(models.APIResponse{
				Success: false,
				Error:   "Access denied",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(models.APIResponse{
		Success: true,
		Message: "Trip duplicated successfully",
		Data:    trip,
	})
}

// ShareTrip creates a shareable link for a trip
func (h *TripHandler) ShareTrip(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}

	tripIDStr := c.Params("id")
	tripID, err := primitive.ObjectIDFromHex(tripIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid trip ID",
		})
	}

	var req struct {
		ExpiryDays int `json:"expiry_days"`
	}
	if err := c.BodyParser(&req); err != nil || req.ExpiryDays <= 0 {
		req.ExpiryDays = 30 // Default to 30 days
	}

	shareToken, err := h.tripService.ShareTrip(context.Background(), tripID, userID, req.ExpiryDays)
	if err != nil {
		if err.Error() == "access denied" {
			return c.Status(fiber.StatusForbidden).JSON(models.APIResponse{
				Success: false,
				Error:   "Access denied",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
			Success: false,
			Error:   "Failed to create share link",
		})
	}

	shareURL := c.BaseURL() + "/api/v1/trips/share/" + shareToken

	return c.JSON(models.APIResponse{
		Success: true,
		Message: "Share link created successfully",
		Data: fiber.Map{
			"share_token": shareToken,
			"share_url":   shareURL,
			"expires_in":  req.ExpiryDays,
		},
	})
}

// GetSharedTrip returns a trip by share token
func (h *TripHandler) GetSharedTrip(c *fiber.Ctx) error {
	shareToken := c.Params("shareToken")

	trip, err := h.tripService.GetSharedTrip(context.Background(), shareToken)
	if err != nil {
		if err.Error() == "invalid share token" || err.Error() == "share link expired" {
			return c.Status(fiber.StatusNotFound).JSON(models.APIResponse{
				Success: false,
				Error:   err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
			Success: false,
			Error:   "Failed to get shared trip",
		})
	}

	return c.JSON(models.APIResponse{
		Success: true,
		Data:    trip,
	})
}

// GetPublicTrips returns public trips with pagination
func (h *TripHandler) GetPublicTrips(c *fiber.Ctx) error {
	page, limit := middleware.GetPagination(c)

	trips, total, err := h.tripService.GetPublicTrips(context.Background(), page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
			Success: false,
			Error:   "Failed to get public trips",
		})
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	response := models.PaginatedResponse{
		Page:       page,
		Limit:      limit,
		TotalItems: total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
		Data:       trips,
	}

	return c.JSON(models.APIResponse{
		Success: true,
		Data:    response,
	})
}
