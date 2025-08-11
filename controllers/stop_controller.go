package controllers

import (
	"strconv"

	"globetrotter/models"
	"globetrotter/services"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type StopController struct {
	stopService *services.StopService
}

func NewStopController() *StopController {
	return &StopController{
		stopService: services.NewStopService(),
	}
}

func (c *StopController) CreateStop(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(primitive.ObjectID)

	tripID, err := primitive.ObjectIDFromHex(ctx.Params("tripId"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid trip ID",
		})
	}

	var req models.CreateStopRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	stop, err := c.stopService.CreateStop(ctx.Context(), tripID, userID, &req)
	if err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "trip not found" {
			status = fiber.StatusNotFound
		} else if err.Error() == "access denied" {
			status = fiber.StatusForbidden
		} else if err.Error() == "departure date must be after arrival date" {
			status = fiber.StatusBadRequest
		}
		return ctx.Status(status).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return ctx.Status(fiber.StatusCreated).JSON(models.APIResponse{
		Success: true,
		Message: "Stop created successfully",
		Data:    stop,
	})
}

func (c *StopController) GetStop(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(primitive.ObjectID)

	stopID, err := primitive.ObjectIDFromHex(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid stop ID",
		})
	}

	stop, err := c.stopService.GetStop(ctx.Context(), stopID, userID)
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
		Data:    stop,
	})
}

func (c *StopController) UpdateStop(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(primitive.ObjectID)

	stopID, err := primitive.ObjectIDFromHex(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid stop ID",
		})
	}

	var req models.UpdateStopRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	stop, err := c.stopService.UpdateStop(ctx.Context(), stopID, userID, &req)
	if err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "stop not found" {
			status = fiber.StatusNotFound
		} else if err.Error() == "access denied" {
			status = fiber.StatusForbidden
		} else if err.Error() == "no fields to update" || err.Error() == "departure date must be after arrival date" {
			status = fiber.StatusBadRequest
		}
		return ctx.Status(status).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return ctx.JSON(models.APIResponse{
		Success: true,
		Message: "Stop updated successfully",
		Data:    stop,
	})
}

func (c *StopController) DeleteStop(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(primitive.ObjectID)

	stopID, err := primitive.ObjectIDFromHex(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid stop ID",
		})
	}

	if err := c.stopService.DeleteStop(ctx.Context(), stopID, userID); err != nil {
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
		Message: "Stop deleted successfully",
	})
}

func (c *StopController) GetTripStops(ctx *fiber.Ctx) error {
	// This endpoint supports both authenticated and unauthenticated access for public trips
	var userID *primitive.ObjectID
	if uid := ctx.Locals("user_id"); uid != nil {
		id := uid.(primitive.ObjectID)
		userID = &id
	}

	tripID, err := primitive.ObjectIDFromHex(ctx.Params("tripId"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid trip ID",
		})
	}

	stops, err := c.stopService.GetTripStops(ctx.Context(), tripID, userID)
	if err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "trip not found" {
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
		Data:    stops,
	})
}

func (c *StopController) GetNearbyStops(ctx *fiber.Ctx) error {
	latStr := ctx.Query("lat")
	lngStr := ctx.Query("lng")
	maxDistanceStr := ctx.Query("maxDistance", "10000") // Default 10km

	if latStr == "" || lngStr == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "lat and lng query parameters are required",
		})
	}

	lat, err := strconv.ParseFloat(latStr, 64)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid lat parameter",
		})
	}

	lng, err := strconv.ParseFloat(lngStr, 64)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid lng parameter",
		})
	}

	maxDistance, err := strconv.ParseFloat(maxDistanceStr, 64)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid maxDistance parameter",
		})
	}

	stops, err := c.stopService.GetNearbyStops(ctx.Context(), lat, lng, maxDistance)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return ctx.JSON(models.APIResponse{
		Success: true,
		Data:    stops,
	})
}
