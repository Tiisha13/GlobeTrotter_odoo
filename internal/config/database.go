package config

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	MongoDB     *mongo.Database
	RedisClient *redis.Client
)

func ConnectMongoDB(config *Config) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(config.MongoURI)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	// Test the connection
	if err = client.Ping(ctx, nil); err != nil {
		return fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	MongoDB = client.Database(config.MongoDatabase)
	log.Println("Connected to MongoDB successfully")
	return nil
}

func ConnectRedis(config *Config) error {
	RedisClient = redis.NewClient(&redis.Options{
		Addr:     config.RedisAddr,
		Password: config.RedisPassword,
		DB:       config.RedisDB,
	})

	ctx := context.Background()
	_, err := RedisClient.Ping(ctx).Result()
	if err != nil {
		return fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Println("Connected to Redis successfully")
	return nil
}

func DisconnectMongoDB() error {
	if MongoDB != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return MongoDB.Client().Disconnect(ctx)
	}
	return nil
}

func DisconnectRedis() error {
	if RedisClient != nil {
		return RedisClient.Close()
	}
	return nil
}
