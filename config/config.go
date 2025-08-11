package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	MongoURI       string
	MongoDatabase  string
	RedisAddr      string
	RedisPassword  string
	RedisDB        int
	JWTSecret      string
	JWTExpiryHours int
	Environment    string
	AllowedOrigins string
}

var AppConfig *Config

func LoadConfig() {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	AppConfig = &Config{
		Port:           getEnv("PORT", "8080"),
		MongoURI:       getEnv("MONGO_URI", "mongodb://localhost:27017"),
		MongoDatabase:  getEnv("MONGO_DATABASE", "globetrotter"),
		RedisAddr:      getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword:  getEnv("REDIS_PASSWORD", ""),
		RedisDB:        getEnvAsInt("REDIS_DB", 0),
		JWTSecret:      getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		JWTExpiryHours: getEnvAsInt("JWT_EXPIRY_HOURS", 72),
		Environment:    getEnv("ENVIRONMENT", "development"),
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "*"),
	}

	log.Printf("Config loaded - Environment: %s, Port: %s", AppConfig.Environment, AppConfig.Port)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
