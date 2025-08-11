package controllers

import (
	"strconv"

	"globetrotter/models"
	"globetrotter/services"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserController struct {
	userService *services.UserService
}

func NewUserController() *UserController {
	return &UserController{
		userService: services.NewUserService(),
	}
}

func (c *UserController) Signup(ctx *fiber.Ctx) error {
	var req models.CreateUserRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	user, err := c.userService.CreateUser(ctx.Context(), &req)
	if err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "user with this email already exists" {
			status = fiber.StatusConflict
		}
		return ctx.Status(status).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	response := user.ToResponse()
	return ctx.Status(fiber.StatusCreated).JSON(models.APIResponse{
		Success: true,
		Message: "User created successfully",
		Data:    response,
	})
}

func (c *UserController) Login(ctx *fiber.Ctx) error {
	var req models.LoginRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	loginResponse, err := c.userService.LoginUser(ctx.Context(), &req)
	if err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "invalid credentials" {
			status = fiber.StatusUnauthorized
		}
		return ctx.Status(status).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return ctx.JSON(models.APIResponse{
		Success: true,
		Message: "Login successful",
		Data:    loginResponse,
	})
}

func (c *UserController) GetProfile(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(primitive.ObjectID)

	profile, err := c.userService.GetUserProfile(ctx.Context(), userID)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return ctx.JSON(models.APIResponse{
		Success: true,
		Data:    profile,
	})
}

func (c *UserController) UpdateProfile(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(primitive.ObjectID)

	var req models.UpdateUserRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	profile, err := c.userService.UpdateUserProfile(ctx.Context(), userID, &req)
	if err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "no fields to update" {
			status = fiber.StatusBadRequest
		}
		return ctx.Status(status).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return ctx.JSON(models.APIResponse{
		Success: true,
		Message: "Profile updated successfully",
		Data:    profile,
	})
}

func (c *UserController) DeleteProfile(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(primitive.ObjectID)

	if err := c.userService.DeleteUser(ctx.Context(), userID); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return ctx.JSON(models.APIResponse{
		Success: true,
		Message: "Profile deleted successfully",
	})
}

func (c *UserController) ListUsers(ctx *fiber.Ctx) error {
	page, _ := strconv.Atoi(ctx.Query("page", "1"))
	limit, _ := strconv.Atoi(ctx.Query("limit", "20"))

	response, err := c.userService.ListUsers(ctx.Context(), page, limit)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return ctx.JSON(models.APIResponse{
		Success: true,
		Data:    response,
	})
}
