package controllers

import (
	"strconv"

	"globetrotter/models"
	"globetrotter/services"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type TripController struct {
	tripService *services.TripService
}

func NewTripController() *TripController {
	return &TripController{
		tripService: services.NewTripService(),
	}
}

func (c *TripController) CreateTrip(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(primitive.ObjectID)

	var req models.CreateTripRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	trip, err := c.tripService.CreateTrip(ctx.Context(), userID, &req)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return ctx.Status(fiber.StatusCreated).JSON(models.APIResponse{
		Success: true,
		Message: "Trip created successfully",
		Data:    trip,
	})
}

func (c *TripController) GetTrip(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(primitive.ObjectID)

	tripID, err := primitive.ObjectIDFromHex(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid trip ID",
		})
	}

	trip, err := c.tripService.GetTrip(ctx.Context(), tripID, &userID)
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
		Data:    trip,
	})
}

func (c *TripController) GetPublicTrip(ctx *fiber.Ctx) error {
	shareToken := ctx.Params("shareToken")

	trip, err := c.tripService.GetPublicTrip(ctx.Context(), shareToken)
	if err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "trip not found or not public" {
			status = fiber.StatusNotFound
		}
		return ctx.Status(status).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return ctx.JSON(models.APIResponse{
		Success: true,
		Data:    trip,
	})
}

func (c *TripController) UpdateTrip(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(primitive.ObjectID)

	tripID, err := primitive.ObjectIDFromHex(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid trip ID",
		})
	}

	var req models.UpdateTripRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid request body",
		})
	}

	trip, err := c.tripService.UpdateTrip(ctx.Context(), tripID, userID, &req)
	if err != nil {
		status := fiber.StatusInternalServerError
		if err.Error() == "trip not found" {
			status = fiber.StatusNotFound
		} else if err.Error() == "access denied" {
			status = fiber.StatusForbidden
		} else if err.Error() == "no fields to update" || err.Error() == "end date must be after start date" {
			status = fiber.StatusBadRequest
		}
		return ctx.Status(status).JSON(models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return ctx.JSON(models.APIResponse{
		Success: true,
		Message: "Trip updated successfully",
		Data:    trip,
	})
}

func (c *TripController) DeleteTrip(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(primitive.ObjectID)

	tripID, err := primitive.ObjectIDFromHex(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
			Success: false,
			Error:   "Invalid trip ID",
		})
	}

	if err := c.tripService.DeleteTrip(ctx.Context(), tripID, userID); err != nil {
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
		Message: "Trip deleted successfully",
	})
}

func (c *TripController) GetUserTrips(ctx *fiber.Ctx) error {
	userID := ctx.Locals("user_id").(primitive.ObjectID)

	page, _ := strconv.Atoi(ctx.Query("page", "1"))
	limit, _ := strconv.Atoi(ctx.Query("limit", "20"))

	response, err := c.tripService.GetUserTrips(ctx.Context(), userID, page, limit)
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

func (c *TripController) GetPublicTrips(ctx *fiber.Ctx) error {
	page, _ := strconv.Atoi(ctx.Query("page", "1"))
	limit, _ := strconv.Atoi(ctx.Query("limit", "20"))

	response, err := c.tripService.GetPublicTrips(ctx.Context(), page, limit)
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
