package services

import (
	"context"
	"fmt"

	"globetrotter/models"
	"globetrotter/repositories"
	"globetrotter/utils"

	"go.mongodb.org/mongo-driver/bson"
)

type AdminService struct {
	userRepo     *repositories.UserRepository
	tripRepo     *repositories.TripRepository
	stopRepo     *repositories.StopRepository
	activityRepo *repositories.ActivityRepository
}

type AdminStats struct {
	TotalUsers      int64         `json:"total_users"`
	TotalTrips      int64         `json:"total_trips"`
	TotalStops      int64         `json:"total_stops"`
	TotalActivities int64         `json:"total_activities"`
	TopCities       []interface{} `json:"top_cities"`
	AverageBudget   float64       `json:"average_budget"`
}

func NewAdminService() *AdminService {
	return &AdminService{
		userRepo:     repositories.NewUserRepository(),
		tripRepo:     repositories.NewTripRepository(),
		stopRepo:     repositories.NewStopRepository(),
		activityRepo: repositories.NewActivityRepository(),
	}
}

func (s *AdminService) GetUsers(ctx context.Context, page, limit int) (*models.PaginationResponse, error) {
	return NewUserService().ListUsers(ctx, page, limit)
}

func (s *AdminService) GetTrips(ctx context.Context, page, limit int) (*models.PaginationResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	trips, total, err := s.tripRepo.GetAllTrips(ctx, page, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get all trips: %w", err)
	}

	// Convert to response format
	tripResponses := make([]models.TripResponse, len(trips))
	for i, trip := range trips {
		tripResponses[i] = trip.ToResponse()
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	return &models.PaginationResponse{
		Page:       page,
		Limit:      limit,
		TotalItems: total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
		Data:       tripResponses,
	}, nil
}

func (s *AdminService) GetStats(ctx context.Context) (*AdminStats, error) {
	// Try cache first
	var cachedStats AdminStats
	if err := utils.GetCache(ctx, utils.CacheKeyAdminStats, &cachedStats); err == nil {
		return &cachedStats, nil
	}

	// Get stats from repositories
	totalUsers, err := s.userRepo.GetStats(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get user stats: %w", err)
	}

	totalTrips, err := s.tripRepo.GetStats(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get trip stats: %w", err)
	}

	totalStops, err := s.stopRepo.GetStats(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get stop stats: %w", err)
	}

	totalActivities, err := s.activityRepo.GetStats(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get activity stats: %w", err)
	}

	topCities, err := s.tripRepo.GetTopCities(ctx, 10)
	if err != nil {
		return nil, fmt.Errorf("failed to get top cities: %w", err)
	}

	averageBudget, err := s.tripRepo.GetAverageBudget(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get average budget: %w", err)
	}

	stats := &AdminStats{
		TotalUsers:      totalUsers,
		TotalTrips:      totalTrips,
		TotalStops:      totalStops,
		TotalActivities: totalActivities,
		TopCities:       convertBsonMToInterface(topCities),
		AverageBudget:   averageBudget,
	}

	// Cache the stats
	utils.SetCache(ctx, utils.CacheKeyAdminStats, stats, utils.CacheTTLAdminStats)

	return stats, nil
}

func convertBsonMToInterface(data []bson.M) []interface{} {
	result := make([]interface{}, len(data))
	for i, item := range data {
		result[i] = item
	}
	return result
}
