package middlewares

import (
	"log"
	"time"

	"globetrotter/config"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func SetupMiddlewares(app *fiber.App) {
	// Recover middleware to handle panics
	app.Use(recover.New())

	// CORS middleware
	corsConfig := cors.Config{
		AllowOrigins: config.AppConfig.AllowedOrigins,
		AllowMethods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
	}

	// Only enable credentials if not using wildcard origins
	if config.AppConfig.AllowedOrigins != "*" {
		corsConfig.AllowCredentials = true
	}

	app.Use(cors.New(corsConfig))

	// Logger middleware
	if config.AppConfig.Environment != "production" {
		app.Use(logger.New(logger.Config{
			Format: "[${time}] ${status} - ${method} ${path} - ${latency}\n",
		}))
	}

	// Custom error handler
	app.Use(func(c *fiber.Ctx) error {
		start := time.Now()
		err := c.Next()

		if err != nil {
			log.Printf("Error handling request %s %s: %v", c.Method(), c.Path(), err)
		}

		// Log slow requests (>1 second)
		duration := time.Since(start)
		if duration > time.Second {
			log.Printf("Slow request: %s %s took %v", c.Method(), c.Path(), duration)
		}

		return err
	})
}

func ValidateJSON() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if c.Method() == "POST" || c.Method() == "PUT" || c.Method() == "PATCH" {
			contentType := c.Get("Content-Type")
			if contentType != "application/json" && contentType != "" {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"success": false,
					"error":   "Content-Type must be application/json",
				})
			}
		}
		return c.Next()
	}
}

func RateLimit() fiber.Handler {
	// This is a placeholder for rate limiting
	// In production, you would use a proper rate limiting middleware
	return func(c *fiber.Ctx) error {
		return c.Next()
	}
}
