// Package main provides the entry point for the GlobeTrotter API server.
// This server implements a production-ready travel planning API with JWT authentication,
// MongoDB storage, Redis caching, and horizontal scaling capabilities.
package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"globetrotter/internal/api"
	"globetrotter/internal/auth"
	"globetrotter/internal/cache"
	"globetrotter/internal/config"
	"globetrotter/internal/middleware"
	"globetrotter/internal/service"
	"globetrotter/internal/store"
	"globetrotter/migrations"

	"github.com/gofiber/fiber/v2"
)

// main initializes and starts the GlobeTrotter API server.
// It sets up database connections, initializes services, configures middleware,
// and starts the HTTP server with graceful shutdown handling.
func main() {
	// Load configuration
	cfg := config.LoadConfig()

	// Connect to databases
	config.ConnectMongoDB(cfg)
	config.ConnectRedis(cfg)

	// Create database indexes
	if err := migrations.CreateIndexes(config.MongoDB); err != nil {
		log.Fatalf("Failed to create database indexes: %v", err)
	}

	// Initialize services
	authService := auth.NewAuthService(cfg)
	cacheService := cache.NewCacheService(config.RedisClient, cfg)

	// Initialize repositories
	userRepo := store.NewUserRepository(config.MongoDB)
	tripRepo := store.NewTripRepository(config.MongoDB)
	stopRepo := store.NewStopRepository(config.MongoDB)
	sharedTripRepo := store.NewSharedTripRepository(config.MongoDB)

	// Initialize services
	userService := service.NewUserService(userRepo, authService, cacheService, cfg)
	tripService := service.NewTripService(tripRepo, stopRepo, sharedTripRepo, userRepo, cacheService, cfg)

	// Initialize handlers
	userHandler := api.NewUserHandler(userService)
	tripHandler := api.NewTripHandler(tripService)

	// Initialize middleware
	middlewareInstance := middleware.NewMiddleware(authService, cacheService, cfg)

	// Create Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}

			return c.Status(code).JSON(fiber.Map{
				"success": false,
				"error":   err.Error(),
			})
		},
	})

	// Setup middlewares
	setupMiddlewares(app, middlewareInstance)

	// Setup routes
	setupRoutes(app, userHandler, tripHandler, middlewareInstance)

	// Static file serving for uploads
	app.Static("/static", "./uploads")

	// Health check endpoint
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":      "ok",
			"environment": cfg.Environment,
		})
	})

	// Graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		log.Println("Gracefully shutting down...")
		// Close database connections
		if config.MongoDB != nil {
			config.MongoDB.Client().Disconnect(context.Background())
		}
		if config.RedisClient != nil {
			config.RedisClient.Close()
		}
		app.Shutdown()
	}()

	// Start server
	log.Printf("Server starting on port %s", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// setupMiddlewares configures all HTTP middleware for the Fiber application.
// This includes recovery, logging, CORS, rate limiting, and other security middleware.
func setupMiddlewares(app *fiber.App, mw *middleware.Middleware) {
	// Use the middleware instance to setup all middleware
	mw.SetupMiddleware(app)
}

// setupRoutes configures all API routes and their corresponding handlers.
// Routes are organized by functionality: authentication, users, trips.
// Authentication middleware is applied where required.
func setupRoutes(app *fiber.App, userHandler *api.UserHandler, tripHandler *api.TripHandler, mw *middleware.Middleware) {
	api := app.Group("/api/v1")

	// Auth routes (public)
	auth := api.Group("/auth")
	auth.Post("/signup", userHandler.Signup)
	auth.Post("/login", userHandler.Login)

	// User routes
	users := api.Group("/users")
	users.Use(mw.AuthRequired())
	users.Get("/me", userHandler.GetProfile)
	users.Put("/me", userHandler.UpdateProfile)
	users.Delete("/me", userHandler.DeleteProfile)
	users.Post("/avatar", userHandler.UploadAvatar)

	// Trip routes
	trips := api.Group("/trips")

	// Public trip endpoints
	trips.Get("/public", middleware.Pagination(), tripHandler.GetPublicTrips)
	trips.Get("/share/:shareToken", tripHandler.GetSharedTrip)

	// Authenticated trip endpoints
	trips.Use(mw.AuthRequired())
	trips.Use(mw.RateLimit()) // Rate limiting
	trips.Post("/", tripHandler.CreateTrip)
	trips.Get("/", tripHandler.GetTrips)
	trips.Get("/:id", tripHandler.GetTripByID)
	trips.Put("/:id", tripHandler.UpdateTrip)
	trips.Delete("/:id", tripHandler.DeleteTrip)
	trips.Post("/:id/share", tripHandler.ShareTrip)
	trips.Post("/:id/duplicate", tripHandler.DuplicateTrip)
}
