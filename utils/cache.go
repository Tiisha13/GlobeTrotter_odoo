package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"globetrotter/config"
)

const (
	CacheKeyPublicTrips    = "public_trips:%d:%d"  // page:limit
	CacheKeyPublicTrip     = "public_trip:%s"      // trip_id
	CacheKeyUserTrips      = "user_trips:%s:%d:%d" // user_id:page:limit
	CacheKeyAdminStats     = "admin_stats"
	CacheKeyTripStops      = "trip_stops:%s"      // trip_id
	CacheKeyStopActivities = "stop_activities:%s" // stop_id
	CacheLockKey           = "lock:%s"            // resource_id
)

const (
	CacheTTLPublicTrips    = 5 * time.Minute
	CacheTTLPublicTrip     = 30 * time.Minute
	CacheTTLUserTrips      = 2 * time.Minute
	CacheTTLAdminStats     = 10 * time.Minute
	CacheTTLTripStops      = 15 * time.Minute
	CacheTTLStopActivities = 10 * time.Minute
	CacheLockTTL           = 30 * time.Second
)

func SetCache(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}

	return config.RedisClient.Set(ctx, key, data, ttl).Err()
}

func GetCache(ctx context.Context, key string, dest interface{}) error {
	data, err := config.RedisClient.Get(ctx, key).Result()
	if err != nil {
		return err
	}

	return json.Unmarshal([]byte(data), dest)
}

func DeleteCache(ctx context.Context, pattern string) error {
	keys, err := config.RedisClient.Keys(ctx, pattern).Result()
	if err != nil {
		return err
	}

	if len(keys) > 0 {
		return config.RedisClient.Del(ctx, keys...).Err()
	}

	return nil
}

func InvalidateTripCaches(ctx context.Context, tripID, userID string) error {
	// Invalidate specific trip cache
	if err := DeleteCache(ctx, fmt.Sprintf(CacheKeyPublicTrip, tripID)); err != nil {
		return err
	}

	// Invalidate public trips cache
	if err := DeleteCache(ctx, "public_trips:*"); err != nil {
		return err
	}

	// Invalidate user trips cache
	if err := DeleteCache(ctx, fmt.Sprintf("user_trips:%s:*", userID)); err != nil {
		return err
	}

	// Invalidate trip stops cache
	if err := DeleteCache(ctx, fmt.Sprintf(CacheKeyTripStops, tripID)); err != nil {
		return err
	}

	return nil
}

func InvalidateStopCaches(ctx context.Context, stopID, tripID string) error {
	// Invalidate stop activities cache
	if err := DeleteCache(ctx, fmt.Sprintf(CacheKeyStopActivities, stopID)); err != nil {
		return err
	}

	// Invalidate trip stops cache
	if err := DeleteCache(ctx, fmt.Sprintf(CacheKeyTripStops, tripID)); err != nil {
		return err
	}

	return nil
}

func InvalidateAdminCaches(ctx context.Context) error {
	return DeleteCache(ctx, CacheKeyAdminStats)
}

// Distributed lock implementation
func AcquireLock(ctx context.Context, resourceID string) (bool, error) {
	lockKey := fmt.Sprintf(CacheLockKey, resourceID)
	result := config.RedisClient.SetNX(ctx, lockKey, "locked", CacheLockTTL)
	return result.Val(), result.Err()
}

func ReleaseLock(ctx context.Context, resourceID string) error {
	lockKey := fmt.Sprintf(CacheLockKey, resourceID)
	return config.RedisClient.Del(ctx, lockKey).Err()
}

// Helper function to execute with distributed lock and return result
func WithLockResult[T any](ctx context.Context, resourceID string, fn func() (T, error)) (T, error) {
	var zero T

	acquired, err := AcquireLock(ctx, resourceID)
	if err != nil {
		return zero, err
	}

	if !acquired {
		return zero, fmt.Errorf("could not acquire lock for resource: %s", resourceID)
	}

	defer ReleaseLock(ctx, resourceID)
	return fn()
}
