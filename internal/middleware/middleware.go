package middleware

import (
	"context"
	"log"
	"strconv"
	"strings"
	"time"

	"globetrotter/internal/auth"
	"globetrotter/internal/cache"
	"globetrotter/internal/config"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Middleware struct {
	authService  *auth.AuthService
	cacheService *cache.CacheService
	config       *config.Config
}

func NewMiddleware(authService *auth.AuthService, cacheService *cache.CacheService, config *config.Config) *Middleware {
	return &Middleware{
		authService:  authService,
		cacheService: cacheService,
		config:       config,
	}
}

// SetupMiddleware configures all middleware for the application
func (m *Middleware) SetupMiddleware(app *fiber.App) {
	// Recovery middleware
	app.Use(recover.New(recover.Config{
		EnableStackTrace: m.config.Environment == "development",
	}))

	// Logger middleware
	app.Use(logger.New(logger.Config{
		Format: "${time} ${status} - ${method} ${path} ${latency}\n",
	}))

	// CORS middleware
	corsConfig := cors.Config{
		AllowOrigins: m.config.AllowedOrigins,
		AllowMethods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
	}

	// Only allow credentials for specific origins, not wildcards
	if m.config.AllowedOrigins != "*" {
		corsConfig.AllowCredentials = true
	}

	app.Use(cors.New(corsConfig))

	// Rate limiting middleware
	app.Use(m.RateLimit())

	// Request ID middleware
	app.Use(m.RequestID())
}

// AuthRequired middleware validates JWT tokens
func (m *Middleware) AuthRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Authorization header is required",
			})
		}

		token, err := auth.ExtractTokenFromHeader(authHeader)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid authorization header format",
			})
		}

		claims, err := m.authService.ValidateAccessToken(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid or expired token",
			})
		}

		// Parse user ID
		userID, err := primitive.ObjectIDFromHex(claims.UserID)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid user ID in token",
			})
		}

		// Store user info in context
		c.Locals("userID", userID)
		c.Locals("userEmail", claims.Email)
		c.Locals("userRole", claims.Role)

		return c.Next()
	}
}

// OptionalAuth middleware validates JWT tokens if present but doesn't require them
func (m *Middleware) OptionalAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Next()
		}

		token, err := auth.ExtractTokenFromHeader(authHeader)
		if err != nil {
			return c.Next()
		}

		claims, err := m.authService.ValidateAccessToken(token)
		if err != nil {
			return c.Next()
		}

		// Parse user ID
		userID, err := primitive.ObjectIDFromHex(claims.UserID)
		if err != nil {
			return c.Next()
		}

		// Store user info in context
		c.Locals("userID", userID)
		c.Locals("userEmail", claims.Email)
		c.Locals("userRole", claims.Role)

		return c.Next()
	}
}

// AdminRequired middleware checks for admin role
func (m *Middleware) AdminRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		role := c.Locals("userRole")
		if role == nil || role.(string) != "admin" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error":   "Admin access required",
			})
		}

		return c.Next()
	}
}

// RateLimit middleware implements rate limiting using Redis
func (m *Middleware) RateLimit() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get identifier (IP address or user ID if authenticated)
		identifier := c.IP()

		if userID := c.Locals("userID"); userID != nil {
			identifier = userID.(primitive.ObjectID).Hex()
		}

		// Create rate limit key
		rateLimitKey := m.cacheService.RateLimitKey(identifier)

		// Increment counter
		ctx := context.Background()
		count, err := m.cacheService.Increment(ctx, rateLimitKey, time.Minute)
		if err != nil {
			// If Redis is down, allow the request but log the error
			log.Printf("Rate limiting error: %v", err)
			return c.Next()
		}

		// Check rate limit
		if count > int64(m.config.RateLimitPerMinute) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"success": false,
				"error":   "Rate limit exceeded",
			})
		}

		// Add rate limit headers
		c.Set("X-RateLimit-Limit", strconv.Itoa(m.config.RateLimitPerMinute))
		c.Set("X-RateLimit-Remaining", strconv.FormatInt(int64(m.config.RateLimitPerMinute)-count, 10))
		c.Set("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(time.Minute).Unix(), 10))

		return c.Next()
	}
}

// RequestID middleware adds a unique request ID to each request
func (m *Middleware) RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		requestID := c.Get("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}

		c.Set("X-Request-ID", requestID)
		c.Locals("requestID", requestID)

		return c.Next()
	}
}

// generateRequestID creates a unique request ID
func generateRequestID() string {
	return primitive.NewObjectID().Hex()
}

// GetUserID extracts user ID from fiber context
func GetUserID(c *fiber.Ctx) (primitive.ObjectID, error) {
	userID := c.Locals("userID")
	if userID == nil {
		return primitive.NilObjectID, fiber.NewError(fiber.StatusUnauthorized, "User not authenticated")
	}

	return userID.(primitive.ObjectID), nil
}

// GetOptionalUserID extracts user ID from fiber context if present
func GetOptionalUserID(c *fiber.Ctx) *primitive.ObjectID {
	userID := c.Locals("userID")
	if userID == nil {
		return nil
	}

	id := userID.(primitive.ObjectID)
	return &id
}

// ValidateContentType ensures the request has the correct content type
func ValidateContentType(contentTypes ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		requestContentType := c.Get("Content-Type")

		for _, contentType := range contentTypes {
			if strings.Contains(requestContentType, contentType) {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusUnsupportedMediaType).JSON(fiber.Map{
			"success": false,
			"error":   "Unsupported content type",
		})
	}
}

// Pagination middleware extracts page and limit from query parameters
func Pagination() fiber.Handler {
	return func(c *fiber.Ctx) error {
		page := c.QueryInt("page", 1)
		limit := c.QueryInt("limit", 20)

		// Validate and set bounds
		if page < 1 {
			page = 1
		}
		if limit < 1 {
			limit = 20
		}
		if limit > 100 {
			limit = 100
		}

		c.Locals("page", page)
		c.Locals("limit", limit)

		return c.Next()
	}
}

// GetPagination extracts pagination parameters from context
func GetPagination(c *fiber.Ctx) (int, int) {
	page := 1
	limit := 20

	// Try to get from locals first (if Pagination middleware was used)
	if pageVal := c.Locals("page"); pageVal != nil {
		if p, ok := pageVal.(int); ok {
			page = p
		}
	} else {
		// Fallback to query parameters
		page = c.QueryInt("page", 1)
	}

	if limitVal := c.Locals("limit"); limitVal != nil {
		if l, ok := limitVal.(int); ok {
			limit = l
		}
	} else {
		// Fallback to query parameters
		limit = c.QueryInt("limit", 20)
	}

	// Validate bounds
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	return page, limit
}
