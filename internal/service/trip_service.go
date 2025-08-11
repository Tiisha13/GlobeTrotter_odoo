package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"globetrotter/internal/cache"
	"globetrotter/internal/config"
	"globetrotter/internal/models"
	"globetrotter/internal/store"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type TripService struct {
	tripRepo       *store.TripRepository
	stopRepo       *store.StopRepository
	sharedTripRepo *store.SharedTripRepository
	userRepo       *store.UserRepository
	cacheService   *cache.CacheService
	config         *config.Config
}

func NewTripService(
	tripRepo *store.TripRepository,
	stopRepo *store.StopRepository,
	sharedTripRepo *store.SharedTripRepository,
	userRepo *store.UserRepository,
	cacheService *cache.CacheService,
	config *config.Config,
) *TripService {
	return &TripService{
		tripRepo:       tripRepo,
		stopRepo:       stopRepo,
		sharedTripRepo: sharedTripRepo,
		userRepo:       userRepo,
		cacheService:   cacheService,
		config:         config,
	}
}

func (s *TripService) CreateTrip(ctx context.Context, userID primitive.ObjectID, req *models.CreateTripRequest) (*models.Trip, error) {
	// Validate dates
	if req.EndDate.Before(req.StartDate) {
		return nil, fmt.Errorf("end date must be after start date")
	}

	trip := &models.Trip{
		OwnerID:       userID,
		Name:          req.Name,
		StartDate:     req.StartDate,
		EndDate:       req.EndDate,
		Description:   req.Description,
		CoverPhotoURL: req.CoverPhotoURL,
		Privacy:       req.Privacy,
	}

	err := s.tripRepo.Create(ctx, trip)
	if err != nil {
		return nil, fmt.Errorf("failed to create trip: %w", err)
	}

	// Invalidate user trips cache
	s.cacheService.InvalidateUserCache(ctx, userID.Hex())

	return trip, nil
}

func (s *TripService) GetTrip(ctx context.Context, tripID primitive.ObjectID, userID *primitive.ObjectID) (*models.TripWithDetails, error) {
	trip, err := s.tripRepo.GetByID(ctx, tripID)
	if err != nil {
		return nil, fmt.Errorf("failed to get trip: %w", err)
	}

	// Check permission
	if trip.Privacy == "private" && (userID == nil || *userID != trip.OwnerID) {
		return nil, fmt.Errorf("access denied")
	}

	// Get owner details
	owner, err := s.userRepo.GetByID(ctx, trip.OwnerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get trip owner: %w", err)
	}

	// Get stops count
	stops, err := s.stopRepo.GetByTripID(ctx, tripID)
	if err != nil {
		return nil, fmt.Errorf("failed to get stops: %w", err)
	}

	return &models.TripWithDetails{
		Trip:       *trip,
		Owner:      *owner,
		StopsCount: len(stops),
	}, nil
}

func (s *TripService) GetUserTrips(ctx context.Context, userID primitive.ObjectID, page, limit int) ([]*models.TripWithDetails, int64, error) {
	// Try cache first
	cacheKey := fmt.Sprintf("user:trips:%s:%d:%d", userID.Hex(), page, limit)
	var cachedResult struct {
		Trips []models.TripWithDetails `json:"trips"`
		Total int64                    `json:"total"`
	}

	err := s.cacheService.Get(ctx, cacheKey, &cachedResult)
	if err == nil {
		// Convert back to pointer slice
		trips := make([]*models.TripWithDetails, len(cachedResult.Trips))
		for i := range cachedResult.Trips {
			trips[i] = &cachedResult.Trips[i]
		}
		return trips, cachedResult.Total, nil
	}

	trips, total, err := s.tripRepo.GetByOwnerID(ctx, userID, page, limit)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get user trips: %w", err)
	}

	// Get trip details
	var tripsWithDetails []*models.TripWithDetails
	for _, trip := range trips {
		// Get owner details (same user)
		owner, err := s.userRepo.GetByID(ctx, trip.OwnerID)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to get trip owner: %w", err)
		}

		// Get stops count
		stops, err := s.stopRepo.GetByTripID(ctx, trip.ID)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to get stops: %w", err)
		}

		tripsWithDetails = append(tripsWithDetails, &models.TripWithDetails{
			Trip:       *trip,
			Owner:      *owner,
			StopsCount: len(stops),
		})
	}

	// Cache result
	cacheData := struct {
		Trips []models.TripWithDetails `json:"trips"`
		Total int64                    `json:"total"`
	}{
		Total: total,
	}

	for _, trip := range tripsWithDetails {
		cacheData.Trips = append(cacheData.Trips, *trip)
	}

	s.cacheService.Set(ctx, cacheKey, cacheData, time.Duration(s.config.CacheTTLSearch)*time.Second)

	return tripsWithDetails, total, nil
}

func (s *TripService) GetPublicTrips(ctx context.Context, page, limit int) ([]*models.TripWithDetails, int64, error) {
	// Try cache first
	cacheKey := fmt.Sprintf("public:trips:%d:%d", page, limit)
	var cachedResult struct {
		Trips []models.TripWithDetails `json:"trips"`
		Total int64                    `json:"total"`
	}

	err := s.cacheService.Get(ctx, cacheKey, &cachedResult)
	if err == nil {
		// Convert back to pointer slice
		trips := make([]*models.TripWithDetails, len(cachedResult.Trips))
		for i := range cachedResult.Trips {
			trips[i] = &cachedResult.Trips[i]
		}
		return trips, cachedResult.Total, nil
	}

	trips, total, err := s.tripRepo.GetPublicTrips(ctx, page, limit)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get public trips: %w", err)
	}

	// Get trip details
	var tripsWithDetails []*models.TripWithDetails
	for _, trip := range trips {
		// Get owner details
		owner, err := s.userRepo.GetByID(ctx, trip.OwnerID)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to get trip owner: %w", err)
		}

		// Get stops count
		stops, err := s.stopRepo.GetByTripID(ctx, trip.ID)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to get stops: %w", err)
		}

		tripsWithDetails = append(tripsWithDetails, &models.TripWithDetails{
			Trip:       *trip,
			Owner:      *owner,
			StopsCount: len(stops),
		})
	}

	// Cache result
	cacheData := struct {
		Trips []models.TripWithDetails `json:"trips"`
		Total int64                    `json:"total"`
	}{
		Total: total,
	}

	for _, trip := range tripsWithDetails {
		cacheData.Trips = append(cacheData.Trips, *trip)
	}

	s.cacheService.Set(ctx, cacheKey, cacheData, time.Duration(s.config.CacheTTLPopular)*time.Second)

	return tripsWithDetails, total, nil
}

func (s *TripService) UpdateTrip(ctx context.Context, tripID, userID primitive.ObjectID, req *models.UpdateTripRequest) (*models.Trip, error) {
	// Check ownership
	isOwner, err := s.tripRepo.IsOwner(ctx, tripID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to check ownership: %w", err)
	}
	if !isOwner {
		return nil, fmt.Errorf("access denied")
	}

	// Build update document
	updates := bson.M{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.StartDate != nil {
		updates["start_date"] = *req.StartDate
	}
	if req.EndDate != nil {
		updates["end_date"] = *req.EndDate
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.CoverPhotoURL != nil {
		updates["cover_photo_url"] = *req.CoverPhotoURL
	}
	if req.Privacy != nil {
		updates["privacy"] = *req.Privacy
	}

	// Validate dates if both are provided
	if req.StartDate != nil && req.EndDate != nil {
		if req.EndDate.Before(*req.StartDate) {
			return nil, fmt.Errorf("end date must be after start date")
		}
	}

	err = s.tripRepo.Update(ctx, tripID, updates)
	if err != nil {
		return nil, fmt.Errorf("failed to update trip: %w", err)
	}

	// Invalidate caches
	s.cacheService.InvalidateTripCache(ctx, tripID.Hex())
	s.cacheService.InvalidateUserCache(ctx, userID.Hex())

	// Get updated trip
	trip, err := s.tripRepo.GetByID(ctx, tripID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated trip: %w", err)
	}

	return trip, nil
}

func (s *TripService) DeleteTrip(ctx context.Context, tripID, userID primitive.ObjectID) error {
	// Check ownership
	isOwner, err := s.tripRepo.IsOwner(ctx, tripID, userID)
	if err != nil {
		return fmt.Errorf("failed to check ownership: %w", err)
	}
	if !isOwner {
		return fmt.Errorf("access denied")
	}

	// Delete shared trips
	err = s.sharedTripRepo.DeleteByTripID(ctx, tripID)
	if err != nil {
		return fmt.Errorf("failed to delete shared trips: %w", err)
	}

	// Delete trip
	err = s.tripRepo.Delete(ctx, tripID)
	if err != nil {
		return fmt.Errorf("failed to delete trip: %w", err)
	}

	// Invalidate caches
	s.cacheService.InvalidateTripCache(ctx, tripID.Hex())
	s.cacheService.InvalidateUserCache(ctx, userID.Hex())

	return nil
}

func (s *TripService) DuplicateTrip(ctx context.Context, tripID, userID primitive.ObjectID, newName string) (*models.Trip, error) {
	// Check if original trip exists and is accessible
	originalTrip, err := s.GetTrip(ctx, tripID, &userID)
	if err != nil {
		return nil, fmt.Errorf("failed to access original trip: %w", err)
	}

	// For public trips, allow duplication by anyone
	// For private trips, only owner can duplicate
	if originalTrip.Privacy == "private" && userID != originalTrip.OwnerID {
		return nil, fmt.Errorf("access denied")
	}

	// Create duplicate
	newTrip, err := s.tripRepo.Duplicate(ctx, tripID, userID, newName)
	if err != nil {
		return nil, fmt.Errorf("failed to duplicate trip: %w", err)
	}

	// Invalidate user cache
	s.cacheService.InvalidateUserCache(ctx, userID.Hex())

	return newTrip, nil
}

func (s *TripService) ShareTrip(ctx context.Context, tripID, userID primitive.ObjectID, expiryDays int) (string, error) {
	// Check ownership
	isOwner, err := s.tripRepo.IsOwner(ctx, tripID, userID)
	if err != nil {
		return "", fmt.Errorf("failed to check ownership: %w", err)
	}
	if !isOwner {
		return "", fmt.Errorf("access denied")
	}

	// Generate share token
	tokenBytes := make([]byte, 16)
	_, err = rand.Read(tokenBytes)
	if err != nil {
		return "", fmt.Errorf("failed to generate share token: %w", err)
	}
	shareToken := hex.EncodeToString(tokenBytes)

	// Create shared trip
	sharedTrip := &models.SharedTrip{
		TripID:     tripID,
		ShareToken: shareToken,
		ExpiresAt:  time.Now().Add(time.Duration(expiryDays) * 24 * time.Hour),
		CreatedAt:  time.Now(),
	}

	err = s.sharedTripRepo.Create(ctx, sharedTrip)
	if err != nil {
		return "", fmt.Errorf("failed to create shared trip: %w", err)
	}

	return shareToken, nil
}

func (s *TripService) GetSharedTrip(ctx context.Context, shareToken string) (*models.TripWithDetails, error) {
	// Get shared trip
	sharedTrip, err := s.sharedTripRepo.GetByToken(ctx, shareToken)
	if err != nil {
		if err == store.ErrNotFound {
			return nil, fmt.Errorf("invalid share token")
		}
		return nil, fmt.Errorf("failed to get shared trip: %w", err)
	}

	// Check expiry
	if time.Now().After(sharedTrip.ExpiresAt) {
		return nil, fmt.Errorf("share link expired")
	}

	// Get trip details
	return s.GetTrip(ctx, sharedTrip.TripID, nil)
}
