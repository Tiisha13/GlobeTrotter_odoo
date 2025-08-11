package config

import (
	"context"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	MongoDB     *mongo.Database
	RedisClient *redis.Client
)

func ConnectMongoDB() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(AppConfig.MongoURI))
	if err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}

	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal("Failed to ping MongoDB:", err)
	}

	MongoDB = client.Database(AppConfig.MongoDatabase)
	log.Println("Connected to MongoDB successfully")

	// Create indexes
	createIndexes()
}

func ConnectRedis() {
	RedisClient = redis.NewClient(&redis.Options{
		Addr:     AppConfig.RedisAddr,
		Password: AppConfig.RedisPassword,
		DB:       AppConfig.RedisDB,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := RedisClient.Ping(ctx).Err(); err != nil {
		log.Fatal("Failed to connect to Redis:", err)
	}

	log.Println("Connected to Redis successfully")
}

func createIndexes() {
	ctx := context.Background()

	// Users collection indexes
	usersCollection := MongoDB.Collection("users")

	// Unique email index
	emailIndex := mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	}
	if _, err := usersCollection.Indexes().CreateOne(ctx, emailIndex); err != nil {
		log.Printf("Error creating email index: %v", err)
	}

	// Trips collection indexes
	tripsCollection := MongoDB.Collection("trips")

	// Compound index for public trips
	publicTripsIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "is_public", Value: 1},
			{Key: "created_at", Value: -1},
		},
	}
	if _, err := tripsCollection.Indexes().CreateOne(ctx, publicTripsIndex); err != nil {
		log.Printf("Error creating public trips index: %v", err)
	}

	// User trips index
	userTripsIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "created_at", Value: -1},
		},
	}
	if _, err := tripsCollection.Indexes().CreateOne(ctx, userTripsIndex); err != nil {
		log.Printf("Error creating user trips index: %v", err)
	}

	// Share token index
	shareTokenIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "share_token", Value: 1}},
	}
	if _, err := tripsCollection.Indexes().CreateOne(ctx, shareTokenIndex); err != nil {
		log.Printf("Error creating share token index: %v", err)
	}

	// Stops collection indexes
	stopsCollection := MongoDB.Collection("stops")

	// Trip stops index
	tripStopsIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "trip_id", Value: 1},
			{Key: "position", Value: 1},
		},
	}
	if _, err := stopsCollection.Indexes().CreateOne(ctx, tripStopsIndex); err != nil {
		log.Printf("Error creating trip stops index: %v", err)
	}

	// Geo index for location-based queries
	geoIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "location", Value: "2dsphere"}},
	}
	if _, err := stopsCollection.Indexes().CreateOne(ctx, geoIndex); err != nil {
		log.Printf("Error creating geo index: %v", err)
	}

	// Activities collection indexes
	activitiesCollection := MongoDB.Collection("activities")

	// Stop activities index
	stopActivitiesIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "stop_id", Value: 1},
			{Key: "day_offset", Value: 1},
			{Key: "start_time", Value: 1},
		},
	}
	if _, err := activitiesCollection.Indexes().CreateOne(ctx, stopActivitiesIndex); err != nil {
		log.Printf("Error creating stop activities index: %v", err)
	}

	log.Println("Database indexes created successfully")
}

func CloseDatabaseConnections() {
	if RedisClient != nil {
		if err := RedisClient.Close(); err != nil {
			log.Printf("Error closing Redis connection: %v", err)
		}
	}

	if MongoDB != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := MongoDB.Client().Disconnect(ctx); err != nil {
			log.Printf("Error closing MongoDB connection: %v", err)
		}
	}
}
