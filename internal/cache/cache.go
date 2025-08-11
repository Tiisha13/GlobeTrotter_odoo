package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"globetrotter/internal/config"

	"github.com/redis/go-redis/v9"
)

type CacheService struct {
	client *redis.Client
	config *config.Config
}

func NewCacheService(client *redis.Client, cfg *config.Config) *CacheService {
	return &CacheService{
		client: client,
		config: cfg,
	}
}

// Set stores a value in Redis with TTL
func (c *CacheService) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	jsonData, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}

	err = c.client.Set(ctx, key, jsonData, ttl).Err()
	if err != nil {
		return fmt.Errorf("failed to set cache: %w", err)
	}

	return nil
}

// Get retrieves a value from Redis
func (c *CacheService) Get(ctx context.Context, key string, dest interface{}) error {
	val, err := c.client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return ErrCacheMiss
		}
		return fmt.Errorf("failed to get cache: %w", err)
	}

	err = json.Unmarshal([]byte(val), dest)
	if err != nil {
		return fmt.Errorf("failed to unmarshal value: %w", err)
	}

	return nil
}

// Delete removes a key from Redis
func (c *CacheService) Delete(ctx context.Context, key string) error {
	err := c.client.Del(ctx, key).Err()
	if err != nil {
		return fmt.Errorf("failed to delete cache: %w", err)
	}
	return nil
}

// DeletePattern removes all keys matching a pattern
func (c *CacheService) DeletePattern(ctx context.Context, pattern string) error {
	keys, err := c.client.Keys(ctx, pattern).Result()
	if err != nil {
		return fmt.Errorf("failed to get keys: %w", err)
	}

	if len(keys) > 0 {
		err = c.client.Del(ctx, keys...).Err()
		if err != nil {
			return fmt.Errorf("failed to delete keys: %w", err)
		}
	}

	return nil
}

// Exists checks if a key exists in Redis
func (c *CacheService) Exists(ctx context.Context, key string) (bool, error) {
	result, err := c.client.Exists(ctx, key).Result()
	if err != nil {
		return false, fmt.Errorf("failed to check existence: %w", err)
	}
	return result > 0, nil
}

// Increment increments a counter in Redis
func (c *CacheService) Increment(ctx context.Context, key string, ttl time.Duration) (int64, error) {
	pipe := c.client.TxPipeline()
	incr := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, ttl)
	_, err := pipe.Exec(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to increment: %w", err)
	}
	return incr.Val(), nil
}

// SetNX sets a key only if it doesn't exist (for locking)
func (c *CacheService) SetNX(ctx context.Context, key string, value interface{}, ttl time.Duration) (bool, error) {
	jsonData, err := json.Marshal(value)
	if err != nil {
		return false, fmt.Errorf("failed to marshal value: %w", err)
	}

	result, err := c.client.SetNX(ctx, key, jsonData, ttl).Result()
	if err != nil {
		return false, fmt.Errorf("failed to set nx: %w", err)
	}

	return result, nil
}

// Cache key generators
func (c *CacheService) CitySearchKey(query string) string {
	return fmt.Sprintf("search:cities:%s", query)
}

func (c *CacheService) ActivitySearchKey(cityID, activityType string) string {
	return fmt.Sprintf("search:activities:%s:%s", cityID, activityType)
}

func (c *CacheService) PopularCitiesKey() string {
	return "popular:cities"
}

func (c *CacheService) TripBudgetKey(tripID string) string {
	return fmt.Sprintf("trip:budget:%s", tripID)
}

func (c *CacheService) UserTripsKey(userID string) string {
	return fmt.Sprintf("user:trips:%s", userID)
}

func (c *CacheService) RateLimitKey(identifier string) string {
	return fmt.Sprintf("rate_limit:%s", identifier)
}

func (c *CacheService) LockKey(resource string) string {
	return fmt.Sprintf("lock:%s", resource)
}

// Cache invalidation helpers
func (c *CacheService) InvalidateUserCache(ctx context.Context, userID string) error {
	pattern := fmt.Sprintf("user:*:%s", userID)
	return c.DeletePattern(ctx, pattern)
}

func (c *CacheService) InvalidateTripCache(ctx context.Context, tripID string) error {
	patterns := []string{
		fmt.Sprintf("trip:*:%s", tripID),
		"user:trips:*", // Invalidate all user trip lists
	}

	for _, pattern := range patterns {
		if err := c.DeletePattern(ctx, pattern); err != nil {
			return err
		}
	}

	return nil
}

// Custom errors
var (
	ErrCacheMiss = fmt.Errorf("cache miss")
)

// Distributed lock implementation
type Lock struct {
	cache    *CacheService
	key      string
	value    string
	ttl      time.Duration
	acquired bool
}

func (c *CacheService) NewLock(key string, ttl time.Duration) *Lock {
	return &Lock{
		cache: c,
		key:   c.LockKey(key),
		value: fmt.Sprintf("%d", time.Now().UnixNano()),
		ttl:   ttl,
	}
}

func (l *Lock) Acquire(ctx context.Context) error {
	acquired, err := l.cache.SetNX(ctx, l.key, l.value, l.ttl)
	if err != nil {
		return fmt.Errorf("failed to acquire lock: %w", err)
	}

	if !acquired {
		return fmt.Errorf("lock already acquired")
	}

	l.acquired = true
	return nil
}

func (l *Lock) Release(ctx context.Context) error {
	if !l.acquired {
		return nil
	}

	// Use Lua script to ensure we only delete our own lock
	script := `
		if redis.call("get", KEYS[1]) == ARGV[1] then
			return redis.call("del", KEYS[1])
		else
			return 0
		end
	`

	result, err := l.cache.client.Eval(ctx, script, []string{l.key}, l.value).Result()
	if err != nil {
		return fmt.Errorf("failed to release lock: %w", err)
	}

	if result.(int64) == 1 {
		l.acquired = false
	}

	return nil
}
