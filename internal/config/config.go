// Package config provides configuration management for the GlobeTrotter application.
// It handles environment variables, database connections, and application settings.
package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all configuration values for the application.
// Values are loaded from environment variables with sensible defaults.
type Config struct {
	// Server Configuration
	Port        string // HTTP server port (default: 8080)
	Environment string // Runtime environment: development, staging, production

	// Database Configuration
	MongoURI      string // MongoDB connection string
	MongoDatabase string // MongoDB database name

	// Redis Configuration
	RedisAddr     string // Redis server address (host:port)
	RedisPassword string // Redis authentication password
	RedisDB       int    // Redis database number

	// JWT Configuration
	JWTSecret       string // Secret key for JWT signing
	JWTAccessExpiry int    // Access token expiry in minutes

	// File Upload Configuration
	UploadDir        string
	MaxUploadSize    int64
	AllowedMimeTypes []string

	// CORS Configuration
	AllowedOrigins string // Comma-separated list of allowed origins

	// Cache TTL Configuration (seconds)
	CacheTTLSearch   int // TTL for search results cache
	CacheTTLPopular  int // TTL for popular content cache
	CacheTTLCityMeta int // TTL for city metadata cache

	// Rate Limiting
	RateLimitPerMinute int // Maximum requests per minute per user
}

// AppConfig holds the global application configuration instance.
var AppConfig *Config

// LoadConfig loads configuration from environment variables and .env file.
// It returns a fully populated Config struct with defaults for missing values.
// This function should be called once during application startup.
func LoadConfig() *Config {
	// Load .env file if it exists (optional for development)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	config := &Config{
		// Server Configuration
		Port:        getEnv("PORT", "8080"),
		Environment: getEnv("ENVIRONMENT", "development"),

		// Database Configuration
		MongoURI:      getEnv("MONGO_URI", "mongodb://localhost:27017"),
		MongoDatabase: getEnv("MONGO_DATABASE", "globetrotters"),

		// Redis Configuration
		RedisAddr:     getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       getEnvAsInt("REDIS_DB", 0),

		// JWT
		JWTSecret:       getEnv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production"),
		JWTAccessExpiry: getEnvAsInt("JWT_ACCESS_EXPIRY_MINUTES", 15),

		// File Upload
		UploadDir:     getEnv("UPLOAD_DIR", "./uploads"),
		MaxUploadSize: getEnvAsInt64("MAX_UPLOAD_SIZE", 5*1024*1024), // 5MB
		AllowedMimeTypes: []string{
			"image/jpeg",
			"image/png",
			"image/webp",
		},

		// CORS
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "*"),

		// Cache TTL
		CacheTTLSearch:   getEnvAsInt("CACHE_TTL_SEARCH", 600),      // 10 minutes
		CacheTTLPopular:  getEnvAsInt("CACHE_TTL_POPULAR", 3600),    // 1 hour
		CacheTTLCityMeta: getEnvAsInt("CACHE_TTL_CITY_META", 21600), // 6 hours

		// Rate Limiting
		RateLimitPerMinute: getEnvAsInt("RATE_LIMIT_PER_MINUTE", 100),
	}

	AppConfig = config
	return config
}

// getEnv retrieves an environment variable value with a fallback default.
// Returns the environment variable value if set, otherwise returns defaultValue.
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsInt retrieves an environment variable as an integer with a fallback default.
// Returns the parsed integer value if valid, otherwise returns defaultValue.
func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// getEnvAsInt64 retrieves an environment variable as an int64 with a fallback default.
// Returns the parsed int64 value if valid, otherwise returns defaultValue.
func getEnvAsInt64(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		if int64Value, err := strconv.ParseInt(value, 10, 64); err == nil {
			return int64Value
		}
	}
	return defaultValue
}
