package middlewares

import (
	"strings"

	"globetrotter/models"
	"globetrotter/utils"

	"github.com/gofiber/fiber/v2"
)

func AuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(models.APIResponse{
				Success: false,
				Error:   "Authorization header required",
			})
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			return c.Status(fiber.StatusUnauthorized).JSON(models.APIResponse{
				Success: false,
				Error:   "Invalid authorization header format",
			})
		}

		claims, err := utils.ValidateJWT(tokenString)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(models.APIResponse{
				Success: false,
				Error:   "Invalid or expired token",
			})
		}

		// Store user info in context
		c.Locals("user_id", claims.UserID)
		c.Locals("user_email", claims.Email)
		c.Locals("user_role", claims.Role)

		return c.Next()
	}
}

func AdminMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, ok := c.Locals("user_role").(models.UserRole)
		if !ok || role != models.UserRoleAdmin {
			return c.Status(fiber.StatusForbidden).JSON(models.APIResponse{
				Success: false,
				Error:   "Admin access required",
			})
		}

		return c.Next()
	}
}

func OptionalAuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Next()
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			return c.Next()
		}

		claims, err := utils.ValidateJWT(tokenString)
		if err != nil {
			return c.Next()
		}

		// Store user info in context if valid
		c.Locals("user_id", claims.UserID)
		c.Locals("user_email", claims.Email)
		c.Locals("user_role", claims.Role)

		return c.Next()
	}
}
