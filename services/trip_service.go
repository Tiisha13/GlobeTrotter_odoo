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

type TripService struct {
	tripRepo     *repositories.TripRepository
	stopRepo     *repositories.StopRepository
	activityRepo *repositories.ActivityRepository
}

func NewTripService() *TripService {
	return &TripService{
		tripRepo:     repositories.NewTripRepository(),
		stopRepo:     repositories.NewStopRepository(),
		activityRepo: repositories.NewActivityRepository(),
	}
}

func (s *TripService) CreateTrip(ctx context.Context, userID primitive.ObjectID, req *models.CreateTripRequest) (*models.TripResponse, error) {
	// Validate dates
	if req.EndDate.Before(req.StartDate) {
		return nil, errors.New("end date must be after start date")
	}

	// Generate share token if public
	var shareToken string
	if req.IsPublic {
		token, err := utils.GenerateShareToken()
		if err != nil {
			return nil, fmt.Errorf("failed to generate share token: %w", err)
		}
		shareToken = token
	}

	// Create trip
	trip := &models.Trip{
		UserID:      userID,
		Name:        req.Name,
		Description: req.Description,
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		IsPublic:    req.IsPublic,
		CoverImage:  req.CoverImage,
		TotalBudget: req.TotalBudget,
		Currency:    req.Currency,
		ShareToken:  shareToken,
	}

	if err := s.tripRepo.Create(ctx, trip); err != nil {
		return nil, fmt.Errorf("failed to create trip: %w", err)
	}

	// Invalidate cache
	if req.IsPublic {
		utils.InvalidateTripCaches(ctx, trip.ID.Hex(), userID.Hex())
	}

	response := trip.ToResponse()
	return &response, nil
}

func (s *TripService) GetTrip(ctx context.Context, tripID primitive.ObjectID, userID *primitive.ObjectID) (*models.TripResponse, error) {
	trip, err := s.tripRepo.GetByID(ctx, tripID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("trip not found")
		}
		return nil, fmt.Errorf("failed to get trip: %w", err)
	}

	// Check access permissions
	if !trip.IsPublic && (userID == nil || trip.UserID != *userID) {
		return nil, errors.New("access denied")
	}

	response := trip.ToResponse()
	return &response, nil
}

func (s *TripService) GetPublicTrip(ctx context.Context, shareToken string) (*models.PublicTripResponse, error) {
	// Try to get from cache first
	cacheKey := fmt.Sprintf(utils.CacheKeyPublicTrip, shareToken)
	var cachedTrip models.PublicTripResponse
	if err := utils.GetCache(ctx, cacheKey, &cachedTrip); err == nil {
		// Increment view count asynchronously
		go func() {
			if tripID, err := primitive.ObjectIDFromHex(cachedTrip.ID.Hex()); err == nil {
				s.tripRepo.IncrementViewCount(context.Background(), tripID)
			}
		}()
		return &cachedTrip, nil
	}

	trip, err := s.tripRepo.GetByShareToken(ctx, shareToken)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("trip not found or not public")
		}
		return nil, fmt.Errorf("failed to get trip: %w", err)
	}

	// Increment view count
	if err := s.tripRepo.IncrementViewCount(ctx, trip.ID); err != nil {
		fmt.Printf("Failed to increment view count for trip %s: %v\n", trip.ID.Hex(), err)
	}

	response := trip.ToPublicResponse()

	// Cache the response
	utils.SetCache(ctx, cacheKey, response, utils.CacheTTLPublicTrip)

	return &response, nil
}

func (s *TripService) UpdateTrip(ctx context.Context, tripID, userID primitive.ObjectID, req *models.UpdateTripRequest) (*models.TripResponse, error) {
	// Get trip and check ownership
	trip, err := s.tripRepo.GetByID(ctx, tripID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("trip not found")
		}
		return nil, fmt.Errorf("failed to get trip: %w", err)
	}

	if trip.UserID != userID {
		return nil, errors.New("access denied")
	}

	// Use distributed lock for trip updates
	lockKey := fmt.Sprintf("trip_update_%s", tripID.Hex())
	return s.updateTripWithLock(ctx, lockKey, tripID, userID, req)
}

func (s *TripService) updateTripWithLock(ctx context.Context, lockKey string, tripID, userID primitive.ObjectID, req *models.UpdateTripRequest) (*models.TripResponse, error) {
	return utils.WithLockResult(ctx, lockKey, func() (*models.TripResponse, error) {
		// Build update document
		update := bson.M{}

		if req.Name != nil {
			update["name"] = *req.Name
		}
		if req.Description != nil {
			update["description"] = *req.Description
		}
		if req.StartDate != nil {
			update["start_date"] = *req.StartDate
		}
		if req.EndDate != nil {
			update["end_date"] = *req.EndDate
		}
		if req.IsPublic != nil {
			update["is_public"] = *req.IsPublic
			// Generate share token if making public
			if *req.IsPublic && len(update) > 0 {
				token, err := utils.GenerateShareToken()
				if err != nil {
					return nil, fmt.Errorf("failed to generate share token: %w", err)
				}
				update["share_token"] = token
			}
		}
		if req.CoverImage != nil {
			update["cover_image"] = *req.CoverImage
		}
		if req.TotalBudget != nil {
			update["total_budget"] = *req.TotalBudget
		}
		if req.Currency != nil {
			update["currency"] = *req.Currency
		}

		if len(update) == 0 {
			return nil, errors.New("no fields to update")
		}

		// Validate dates if both are provided
		if req.StartDate != nil && req.EndDate != nil && req.EndDate.Before(*req.StartDate) {
			return nil, errors.New("end date must be after start date")
		}

		// Update trip
		if err := s.tripRepo.Update(ctx, tripID, update); err != nil {
			return nil, fmt.Errorf("failed to update trip: %w", err)
		}

		// Invalidate cache
		utils.InvalidateTripCaches(ctx, tripID.Hex(), userID.Hex())

		// Return updated trip
		return s.GetTrip(ctx, tripID, &userID)
	})
}

func (s *TripService) DeleteTrip(ctx context.Context, tripID, userID primitive.ObjectID) error {
	// Get trip and check ownership
	trip, err := s.tripRepo.GetByID(ctx, tripID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return errors.New("trip not found")
		}
		return fmt.Errorf("failed to get trip: %w", err)
	}

	if trip.UserID != userID {
		return errors.New("access denied")
	}

	// Delete all activities for this trip
	if err := s.activityRepo.DeleteByTrip(ctx, tripID); err != nil {
		return fmt.Errorf("failed to delete trip activities: %w", err)
	}

	// Delete all stops for this trip
	if err := s.stopRepo.DeleteByTrip(ctx, tripID); err != nil {
		return fmt.Errorf("failed to delete trip stops: %w", err)
	}

	// Delete trip
	if err := s.tripRepo.Delete(ctx, tripID); err != nil {
		return fmt.Errorf("failed to delete trip: %w", err)
	}

	// Invalidate cache
	utils.InvalidateTripCaches(ctx, tripID.Hex(), userID.Hex())

	return nil
}

func (s *TripService) GetUserTrips(ctx context.Context, userID primitive.ObjectID, page, limit int) (*models.PaginationResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Try cache first
	cacheKey := fmt.Sprintf(utils.CacheKeyUserTrips, userID.Hex(), page, limit)
	var cachedResponse models.PaginationResponse
	if err := utils.GetCache(ctx, cacheKey, &cachedResponse); err == nil {
		return &cachedResponse, nil
	}

	trips, total, err := s.tripRepo.GetUserTrips(ctx, userID, page, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get user trips: %w", err)
	}

	// Convert to response format
	tripResponses := make([]models.TripResponse, len(trips))
	for i, trip := range trips {
		tripResponses[i] = trip.ToResponse()
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	response := &models.PaginationResponse{
		Page:       page,
		Limit:      limit,
		TotalItems: total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
		Data:       tripResponses,
	}

	// Cache the response
	utils.SetCache(ctx, cacheKey, response, utils.CacheTTLUserTrips)

	return response, nil
}

func (s *TripService) GetPublicTrips(ctx context.Context, page, limit int) (*models.PaginationResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Try cache first
	cacheKey := fmt.Sprintf(utils.CacheKeyPublicTrips, page, limit)
	var cachedResponse models.PaginationResponse
	if err := utils.GetCache(ctx, cacheKey, &cachedResponse); err == nil {
		return &cachedResponse, nil
	}

	trips, total, err := s.tripRepo.GetPublicTrips(ctx, page, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get public trips: %w", err)
	}

	// Convert to public response format
	tripResponses := make([]models.PublicTripResponse, len(trips))
	for i, trip := range trips {
		tripResponses[i] = trip.ToPublicResponse()
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	response := &models.PaginationResponse{
		Page:       page,
		Limit:      limit,
		TotalItems: total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
		Data:       tripResponses,
	}

	// Cache the response
	utils.SetCache(ctx, cacheKey, response, utils.CacheTTLPublicTrips)

	return response, nil
}
