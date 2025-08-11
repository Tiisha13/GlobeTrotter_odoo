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

type StopService struct {
	stopRepo     *repositories.StopRepository
	tripRepo     *repositories.TripRepository
	activityRepo *repositories.ActivityRepository
}

func NewStopService() *StopService {
	return &StopService{
		stopRepo:     repositories.NewStopRepository(),
		tripRepo:     repositories.NewTripRepository(),
		activityRepo: repositories.NewActivityRepository(),
	}
}

func (s *StopService) CreateStop(ctx context.Context, tripID primitive.ObjectID, userID primitive.ObjectID, req *models.CreateStopRequest) (*models.StopResponse, error) {
	// Verify trip ownership
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

	// Validate dates
	if req.DepartureDate.Before(req.ArrivalDate) {
		return nil, errors.New("departure date must be after arrival date")
	}

	// Create stop
	stop := &models.Stop{
		TripID:        tripID,
		City:          req.City,
		Country:       req.Country,
		Lat:           req.Lat,
		Lng:           req.Lng,
		GooglePlaceID: req.GooglePlaceID,
		ArrivalDate:   req.ArrivalDate,
		DepartureDate: req.DepartureDate,
		Position:      req.Position,
		Notes:         req.Notes,
	}

	if err := s.stopRepo.Create(ctx, stop); err != nil {
		return nil, fmt.Errorf("failed to create stop: %w", err)
	}

	// Invalidate caches
	utils.InvalidateTripCaches(ctx, tripID.Hex(), userID.Hex())

	response := stop.ToResponse()
	return &response, nil
}

func (s *StopService) GetStop(ctx context.Context, stopID primitive.ObjectID, userID primitive.ObjectID) (*models.StopResponse, error) {
	stop, err := s.stopRepo.GetByID(ctx, stopID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("stop not found")
		}
		return nil, fmt.Errorf("failed to get stop: %w", err)
	}

	// Verify trip ownership
	trip, err := s.tripRepo.GetByID(ctx, stop.TripID)
	if err != nil {
		return nil, fmt.Errorf("failed to get trip: %w", err)
	}

	if trip.UserID != userID && !trip.IsPublic {
		return nil, errors.New("access denied")
	}

	response := stop.ToResponse()

	// Get activities count
	activitiesCount, err := s.activityRepo.CountByStop(ctx, stopID)
	if err == nil {
		response.ActivitiesCount = int(activitiesCount)
	}

	return &response, nil
}

func (s *StopService) UpdateStop(ctx context.Context, stopID primitive.ObjectID, userID primitive.ObjectID, req *models.UpdateStopRequest) (*models.StopResponse, error) {
	// Get stop and verify ownership
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

	// Build update document
	update := bson.M{}

	if req.City != nil {
		update["city"] = *req.City
	}
	if req.Country != nil {
		update["country"] = *req.Country
	}
	if req.Lat != nil {
		update["lat"] = *req.Lat
	}
	if req.Lng != nil {
		update["lng"] = *req.Lng
	}
	if req.GooglePlaceID != nil {
		update["google_place_id"] = *req.GooglePlaceID
	}
	if req.ArrivalDate != nil {
		update["arrival_date"] = *req.ArrivalDate
	}
	if req.DepartureDate != nil {
		update["departure_date"] = *req.DepartureDate
	}
	if req.Position != nil {
		update["position"] = *req.Position
	}
	if req.Notes != nil {
		update["notes"] = *req.Notes
	}

	// Update location if lat/lng changed
	if req.Lat != nil || req.Lng != nil {
		lat := stop.Lat
		lng := stop.Lng
		if req.Lat != nil {
			lat = *req.Lat
		}
		if req.Lng != nil {
			lng = *req.Lng
		}
		update["location"] = models.NewLocation(lat, lng)
	}

	if len(update) == 0 {
		return nil, errors.New("no fields to update")
	}

	// Validate dates if both are provided
	if req.ArrivalDate != nil && req.DepartureDate != nil && req.DepartureDate.Before(*req.ArrivalDate) {
		return nil, errors.New("departure date must be after arrival date")
	}

	// Update stop
	if err := s.stopRepo.Update(ctx, stopID, update); err != nil {
		return nil, fmt.Errorf("failed to update stop: %w", err)
	}

	// Invalidate caches
	utils.InvalidateStopCaches(ctx, stopID.Hex(), stop.TripID.Hex())
	utils.InvalidateTripCaches(ctx, stop.TripID.Hex(), userID.Hex())

	// Return updated stop
	return s.GetStop(ctx, stopID, userID)
}

func (s *StopService) DeleteStop(ctx context.Context, stopID primitive.ObjectID, userID primitive.ObjectID) error {
	// Get stop and verify ownership
	stop, err := s.stopRepo.GetByID(ctx, stopID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return errors.New("stop not found")
		}
		return fmt.Errorf("failed to get stop: %w", err)
	}

	trip, err := s.tripRepo.GetByID(ctx, stop.TripID)
	if err != nil {
		return fmt.Errorf("failed to get trip: %w", err)
	}

	if trip.UserID != userID {
		return errors.New("access denied")
	}

	// Delete all activities for this stop
	if err := s.activityRepo.DeleteByStop(ctx, stopID); err != nil {
		return fmt.Errorf("failed to delete stop activities: %w", err)
	}

	// Delete stop
	if err := s.stopRepo.Delete(ctx, stopID); err != nil {
		return fmt.Errorf("failed to delete stop: %w", err)
	}

	// Invalidate caches
	utils.InvalidateStopCaches(ctx, stopID.Hex(), stop.TripID.Hex())
	utils.InvalidateTripCaches(ctx, stop.TripID.Hex(), userID.Hex())

	return nil
}

func (s *StopService) GetTripStops(ctx context.Context, tripID primitive.ObjectID, userID *primitive.ObjectID) ([]models.StopResponse, error) {
	// Try cache first
	cacheKey := fmt.Sprintf(utils.CacheKeyTripStops, tripID.Hex())
	var cachedStops []models.StopResponse
	if err := utils.GetCache(ctx, cacheKey, &cachedStops); err == nil {
		return cachedStops, nil
	}

	// Verify trip access
	trip, err := s.tripRepo.GetByID(ctx, tripID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("trip not found")
		}
		return nil, fmt.Errorf("failed to get trip: %w", err)
	}

	if !trip.IsPublic && (userID == nil || trip.UserID != *userID) {
		return nil, errors.New("access denied")
	}

	stops, err := s.stopRepo.GetTripStops(ctx, tripID)
	if err != nil {
		return nil, fmt.Errorf("failed to get trip stops: %w", err)
	}

	// Convert to response format
	stopResponses := make([]models.StopResponse, len(stops))
	for i, stop := range stops {
		stopResponses[i] = stop.ToResponse()

		// Get activities count
		activitiesCount, err := s.activityRepo.CountByStop(ctx, stop.ID)
		if err == nil {
			stopResponses[i].ActivitiesCount = int(activitiesCount)
		}
	}

	// Cache the response
	utils.SetCache(ctx, cacheKey, stopResponses, utils.CacheTTLTripStops)

	return stopResponses, nil
}

func (s *StopService) GetNearbyStops(ctx context.Context, lat, lng, maxDistance float64) ([]models.StopResponse, error) {
	stops, err := s.stopRepo.GetNearbyStops(ctx, lat, lng, maxDistance)
	if err != nil {
		return nil, fmt.Errorf("failed to get nearby stops: %w", err)
	}

	// Convert to response format and filter public trips only
	var stopResponses []models.StopResponse
	for _, stop := range stops {
		// Check if trip is public
		trip, err := s.tripRepo.GetByID(ctx, stop.TripID)
		if err != nil || !trip.IsPublic {
			continue
		}

		stopResponse := stop.ToResponse()
		stopResponses = append(stopResponses, stopResponse)
	}

	return stopResponses, nil
}
