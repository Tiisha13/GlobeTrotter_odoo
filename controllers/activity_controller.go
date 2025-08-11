package controllers

import (
	"globetrotter/models"
	"globetrotter/services"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ActivityController struct {
	activityService *services.ActivityService
}

func NewActivityController() *ActivityController {
	return &ActivityController{
		activityService: services.NewActivityService(),
	}
}

func (c *ActivityController) CreateActivity(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(primitive.ObjectID)

	stopID, err := primitive.ObjectIDFromHex(ctx.Params("stopId"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid stop ID",
		})
	}

	var req models.CreateActivityRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	activity, err := c.activityService.CreateActivity(ctx.Context(), stopID, userID, &req)
	if err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "stop not found" {
			status = fiber.StatusNotFound
		} else if err.Error() == "access denied" {
			status = fiber.StatusForbidden
		}
		return ctx.Status(status).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return ctx.Status(fiber.StatusCreated).JSON(models.APIResponse{
		Success: true,
		Message: "Activity created successfully",
		Data:    activity,
	})
}

func (c *ActivityController) GetActivity(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(primitive.ObjectID)

	activityID, err := primitive.ObjectIDFromHex(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid activity ID",
		})
	}

	activity, err := c.activityService.GetActivity(ctx.Context(), activityID, userID)
	if err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "activity not found" {
			status = fiber.StatusNotFound
		} else if err.Error() == "access denied" {
			status = fiber.StatusForbidden
		}
		return ctx.Status(status).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return ctx.JSON(models.APIResponse{
		Success: true,
		Data:    activity,
	})
}

func (c *ActivityController) UpdateActivity(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(primitive.ObjectID)

	activityID, err := primitive.ObjectIDFromHex(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid activity ID",
		})
	}

	var req models.UpdateActivityRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	activity, err := c.activityService.UpdateActivity(ctx.Context(), activityID, userID, &req)
	if err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "activity not found" {
			status = fiber.StatusNotFound
		} else if err.Error() == "access denied" {
			status = fiber.StatusForbidden
		} else if err.Error() == "no fields to update" {
			status = fiber.StatusBadRequest
		}
		return ctx.Status(status).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return ctx.JSON(models.APIResponse{
		Success: true,
		Message: "Activity updated successfully",
		Data:    activity,
	})
}

func (c *ActivityController) DeleteActivity(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(primitive.ObjectID)

	activityID, err := primitive.ObjectIDFromHex(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid activity ID",
		})
	}

	if err := c.activityService.DeleteActivity(ctx.Context(), activityID, userID); err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "activity not found" {
			status = fiber.StatusNotFound
		} else if err.Error() == "access denied" {
			status = fiber.StatusForbidden
		}
		return ctx.Status(status).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return ctx.JSON(models.APIResponse{
		Success: true,
		Message: "Activity deleted successfully",
	})
}

func (c *ActivityController) GetStopActivities(ctx *fiber.Ctx) error {
	// This endpoint supports both authenticated and unauthenticated access for public trips
	var userID *primitive.ObjectID
	if uid := ctx.Locals("user_id"); uid != nil {
		id := uid.(primitive.ObjectID)
		userID = &id
	}

	stopID, err := primitive.ObjectIDFromHex(ctx.Params("stopId"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid stop ID",
		})
	}

	activities, err := c.activityService.GetStopActivities(ctx.Context(), stopID, userID)
	if err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "stop not found" {
			status = fiber.StatusNotFound
		} else if err.Error() == "access denied" {
			status = fiber.StatusForbidden
		}
		return ctx.Status(status).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return ctx.JSON(models.APIResponse{
		Success: true,
		Data:    activities,
	})
}
