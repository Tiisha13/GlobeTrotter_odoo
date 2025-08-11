package controllers

import (
	"strconv"

	"globetrotter/models"
	"globetrotter/services"

	"github.com/gofiber/fiber/v2"
)

type AdminController struct {
	adminService *services.AdminService
}

func NewAdminController() *AdminController {
	return &AdminController{
		adminService: services.NewAdminService(),
	}
}

func (c *AdminController) GetUsers(ctx *fiber.Ctx) error {
	page, _ := strconv.Atoi(ctx.Query("page", "1"))
	limit, _ := strconv.Atoi(ctx.Query("limit", "20"))

	response, err := c.adminService.GetUsers(ctx.Context(), page, limit)
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

func (c *AdminController) GetTrips(ctx *fiber.Ctx) error {
	page, _ := strconv.Atoi(ctx.Query("page", "1"))
	limit, _ := strconv.Atoi(ctx.Query("limit", "20"))

	response, err := c.adminService.GetTrips(ctx.Context(), page, limit)
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

func (c *AdminController) GetStats(ctx *fiber.Ctx) error {
	stats, err := c.adminService.GetStats(ctx.Context())
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return ctx.JSON(models.APIResponse{
		Success: true,
		Data:    stats,
	})
}
