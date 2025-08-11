package services

import (
	"context"
	"errors"
	"fmt"

	"globetrotter/models"
	"globetrotter/repositories"
	"globetrotter/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type ActivityService struct {
	activityRepo *repositories.ActivityRepository
	stopRepo     *repositories.StopRepository
	tripRepo     *repositories.TripRepository
}

func NewActivityService() *ActivityService {
	return &ActivityService{
		activityRepo: repositories.NewActivityRepository(),
		stopRepo:     repositories.NewStopRepository(),
		tripRepo:     repositories.NewTripRepository(),
	}
}

func (s *ActivityService) CreateActivity(ctx context.Context, stopID primitive.ObjectID, userID primitive.ObjectID, req *models.CreateActivityRequest) (*models.ActivityResponse, error) {
	// Verify stop and trip ownership
	stop, err := s.stopRepo.GetByID(ctx, stopID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("stop not found")
		}
		return nil, fmt.Errorf("failed to get stop: %w", err)
	}

	trip, err := s.tripRepo.GetByID(ctx, stop.TripID)
	if err != nil {
		return nil, fmt.Errorf("failed to get trip: %w", err)
	}

	if trip.UserID != userID {
		return nil, errors.New("access denied")
	}

	// Create activity
	activity := &models.Activity{
		StopID:      stopID,
		Title:       req.Title,
		Description: req.Description,
		Cost:        req.Cost,
		Currency:    req.Currency,
		DayOffset:   req.DayOffset,
		StartTime:   req.StartTime,
		EndTime:     req.EndTime,
		Category:    req.Category,
		Notes:       req.Notes,
		BookingURL:  req.BookingURL,
	}

	if err := s.activityRepo.Create(ctx, activity); err != nil {
		return nil, fmt.Errorf("failed to create activity: %w", err)
	}

	// Invalidate caches
	utils.InvalidateStopCaches(ctx, stopID.Hex(), stop.TripID.Hex())

	response := activity.ToResponse()
	return &response, nil
}

func (s *ActivityService) GetActivity(ctx context.Context, activityID primitive.ObjectID, userID primitive.ObjectID) (*models.ActivityResponse, error) {
	activity, err := s.activityRepo.GetByID(ctx, activityID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("activity not found")
		}
		return nil, fmt.Errorf("failed to get activity: %w", err)
	}

	// Verify access through stop and trip
	stop, err := s.stopRepo.GetByID(ctx, activity.StopID)
	if err != nil {
		return nil, fmt.Errorf("failed to get stop: %w", err)
	}

	trip, err := s.tripRepo.GetByID(ctx, stop.TripID)
	if err != nil {
		return nil, fmt.Errorf("failed to get trip: %w", err)
	}

	if trip.UserID != userID && !trip.IsPublic {
		return nil, errors.New("access denied")
	}

	response := activity.ToResponse()
	return &response, nil
}

func (s *ActivityService) UpdateActivity(ctx context.Context, activityID primitive.ObjectID, userID primitive.ObjectID, req *models.UpdateActivityRequest) (*models.ActivityResponse, error) {
	// Get activity and verify ownership
	activity, err := s.activityRepo.GetByID(ctx, activityID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("activity not found")
		}
		return nil, fmt.Errorf("failed to get activity: %w", err)
	}

	stop, err := s.stopRepo.GetByID(ctx, activity.StopID)
	if err != nil {
		return nil, fmt.Errorf("failed to get stop: %w", err)
	}

	trip, err := s.tripRepo.GetByID(ctx, stop.TripID)
	if err != nil {
		return nil, fmt.Errorf("failed to get trip: %w", err)
	}

	if trip.UserID != userID {
		return nil, errors.New("access denied")
	}

	// Build update document
	update := bson.M{}

	if req.Title != nil {
		update["title"] = *req.Title
	}
	if req.Description != nil {
		update["description"] = *req.Description
	}
	if req.Cost != nil {
		update["cost"] = *req.Cost
	}
	if req.Currency != nil {
		update["currency"] = *req.Currency
	}
	if req.DayOffset != nil {
		update["day_offset"] = *req.DayOffset
	}
	if req.StartTime != nil {
		update["start_time"] = *req.StartTime
	}
	if req.EndTime != nil {
		update["end_time"] = *req.EndTime
	}
	if req.Category != nil {
		update["category"] = *req.Category
	}
	if req.Notes != nil {
		update["notes"] = *req.Notes
	}
	if req.BookingURL != nil {
		update["booking_url"] = *req.BookingURL
	}

	if len(update) == 0 {
		return nil, errors.New("no fields to update")
	}

	// Update activity
	if err := s.activityRepo.Update(ctx, activityID, update); err != nil {
		return nil, fmt.Errorf("failed to update activity: %w", err)
	}

	// Invalidate caches
	utils.InvalidateStopCaches(ctx, activity.StopID.Hex(), stop.TripID.Hex())

	// Return updated activity
	return s.GetActivity(ctx, activityID, userID)
}

func (s *ActivityService) DeleteActivity(ctx context.Context, activityID primitive.ObjectID, userID primitive.ObjectID) error {
	// Get activity and verify ownership
	activity, err := s.activityRepo.GetByID(ctx, activityID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return errors.New("activity not found")
		}
		return fmt.Errorf("failed to get activity: %w", err)
	}

	stop, err := s.stopRepo.GetByID(ctx, activity.StopID)
	if err != nil {
		return fmt.Errorf("failed to get stop: %w", err)
	}

	trip, err := s.tripRepo.GetByID(ctx, stop.TripID)
	if err != nil {
		return fmt.Errorf("failed to get trip: %w", err)
	}

	if trip.UserID != userID {
		return errors.New("access denied")
	}

	// Delete activity
	if err := s.activityRepo.Delete(ctx, activityID); err != nil {
		return fmt.Errorf("failed to delete activity: %w", err)
	}

	// Invalidate caches
	utils.InvalidateStopCaches(ctx, activity.StopID.Hex(), stop.TripID.Hex())

	return nil
}

func (s *ActivityService) GetStopActivities(ctx context.Context, stopID primitive.ObjectID, userID *primitive.ObjectID) ([]models.ActivityResponse, error) {
	// Try cache first
	cacheKey := fmt.Sprintf(utils.CacheKeyStopActivities, stopID.Hex())
	var cachedActivities []models.ActivityResponse
	if err := utils.GetCache(ctx, cacheKey, &cachedActivities); err == nil {
		return cachedActivities, nil
	}

	// Verify stop access
	stop, err := s.stopRepo.GetByID(ctx, stopID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("stop not found")
		}
		return nil, fmt.Errorf("failed to get stop: %w", err)
	}

	trip, err := s.tripRepo.GetByID(ctx, stop.TripID)
	if err != nil {
		return nil, fmt.Errorf("failed to get trip: %w", err)
	}

	if !trip.IsPublic && (userID == nil || trip.UserID != *userID) {
		return nil, errors.New("access denied")
	}

	activities, err := s.activityRepo.GetStopActivities(ctx, stopID)
	if err != nil {
		return nil, fmt.Errorf("failed to get stop activities: %w", err)
	}

	// Convert to response format
	activityResponses := make([]models.ActivityResponse, len(activities))
	for i, activity := range activities {
		activityResponses[i] = activity.ToResponse()
	}

	// Cache the response
	utils.SetCache(ctx, cacheKey, activityResponses, utils.CacheTTLStopActivities)

	return activityResponses, nil
}

func (s *ActivityService) GetActivitiesByCategory(ctx context.Context, stopID primitive.ObjectID, category models.ActivityCategory, userID primitive.ObjectID) ([]models.ActivityResponse, error) {
	// Verify access
	stop, err := s.stopRepo.GetByID(ctx, stopID)
	if err != nil {
		return nil, fmt.Errorf("failed to get stop: %w", err)
	}

	trip, err := s.tripRepo.GetByID(ctx, stop.TripID)
	if err != nil {
		return nil, fmt.Errorf("failed to get trip: %w", err)
	}

	if trip.UserID != userID && !trip.IsPublic {
		return nil, errors.New("access denied")
	}

	activities, err := s.activityRepo.GetByCategory(ctx, stopID, category)
	if err != nil {
		return nil, fmt.Errorf("failed to get activities by category: %w", err)
	}

	// Convert to response format
	activityResponses := make([]models.ActivityResponse, len(activities))
	for i, activity := range activities {
		activityResponses[i] = activity.ToResponse()
	}

	return activityResponses, nil
}

func (s *ActivityService) GetActivitiesByDay(ctx context.Context, stopID primitive.ObjectID, dayOffset int, userID primitive.ObjectID) ([]models.ActivityResponse, error) {
	// Verify access
	stop, err := s.stopRepo.GetByID(ctx, stopID)
	if err != nil {
		return nil, fmt.Errorf("failed to get stop: %w", err)
	}

	trip, err := s.tripRepo.GetByID(ctx, stop.TripID)
	if err != nil {
		return nil, fmt.Errorf("failed to get trip: %w", err)
	}

	if trip.UserID != userID && !trip.IsPublic {
		return nil, errors.New("access denied")
	}

	activities, err := s.activityRepo.GetByDay(ctx, stopID, dayOffset)
	if err != nil {
		return nil, fmt.Errorf("failed to get activities by day: %w", err)
	}

	// Convert to response format
	activityResponses := make([]models.ActivityResponse, len(activities))
	for i, activity := range activities {
		activityResponses[i] = activity.ToResponse()
	}

	return activityResponses, nil
}
