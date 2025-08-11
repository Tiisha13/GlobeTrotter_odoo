package migrations

import (
	"context"
	"log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CreateIndexes creates all necessary MongoDB indexes
func CreateIndexes(db *mongo.Database) error {
	ctx := context.Background()

	// Users collection indexes
	usersCollection := db.Collection("users")

	// Email unique index
	emailIndex := mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	}
	_, err := usersCollection.Indexes().CreateOne(ctx, emailIndex)
	if err != nil {
		return err
	}

	// Trips collection indexes
	tripsCollection := db.Collection("trips")

	// Owner ID index
	ownerIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "owner_id", Value: 1}},
	}
	_, err = tripsCollection.Indexes().CreateOne(ctx, ownerIndex)
	if err != nil {
		return err
	}

	// Privacy and created_at compound index for public trips
	publicTripsIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "privacy", Value: 1},
			{Key: "created_at", Value: -1},
		},
	}
	_, err = tripsCollection.Indexes().CreateOne(ctx, publicTripsIndex)
	if err != nil {
		return err
	}

	// Stops collection indexes
	stopsCollection := db.Collection("stops")

	// Trip ID and order compound index
	stopsIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "trip_id", Value: 1},
			{Key: "order", Value: 1},
		},
	}
	_, err = stopsCollection.Indexes().CreateOne(ctx, stopsIndex)
	if err != nil {
		return err
	}

	// Cities collection indexes
	citiesCollection := db.Collection("cities")

	// Geospatial index for location-based queries
	geoIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "geo", Value: "2dsphere"}},
	}
	_, err = citiesCollection.Indexes().CreateOne(ctx, geoIndex)
	if err != nil {
		return err
	}

	// Text index for city search
	cityTextIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "name", Value: "text"},
			{Key: "country", Value: "text"},
		},
	}
	_, err = citiesCollection.Indexes().CreateOne(ctx, cityTextIndex)
	if err != nil {
		return err
	}

	// Popularity index
	popularityIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "popularity", Value: -1}},
	}
	_, err = citiesCollection.Indexes().CreateOne(ctx, popularityIndex)
	if err != nil {
		return err
	}

	// Activities collection indexes
	activitiesCollection := db.Collection("activities")

	// City ID and popularity compound index
	activitiesIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "city_id", Value: 1},
			{Key: "popularity", Value: -1},
		},
	}
	_, err = activitiesCollection.Indexes().CreateOne(ctx, activitiesIndex)
	if err != nil {
		return err
	}

	// Activity type index
	typeIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "type", Value: 1}},
	}
	_, err = activitiesCollection.Indexes().CreateOne(ctx, typeIndex)
	if err != nil {
		return err
	}

	// Text index for activity search
	activityTextIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "title", Value: "text"},
			{Key: "description", Value: "text"},
		},
	}
	_, err = activitiesCollection.Indexes().CreateOne(ctx, activityTextIndex)
	if err != nil {
		return err
	}

	// Itinerary items collection indexes
	itineraryCollection := db.Collection("itinerary_items")

	// Stop ID, day, and order compound index
	itineraryIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "stop_id", Value: 1},
			{Key: "day", Value: 1},
			{Key: "order", Value: 1},
		},
	}
	_, err = itineraryCollection.Indexes().CreateOne(ctx, itineraryIndex)
	if err != nil {
		return err
	}

	// Shared trips collection indexes
	sharedTripsCollection := db.Collection("shared_trips")

	// Share token unique index
	shareTokenIndex := mongo.IndexModel{
		Keys:    bson.D{{Key: "share_token", Value: 1}},
		Options: options.Index().SetUnique(true),
	}
	_, err = sharedTripsCollection.Indexes().CreateOne(ctx, shareTokenIndex)
	if err != nil {
		return err
	}

	// Expires at index for TTL
	expiresIndex := mongo.IndexModel{
		Keys:    bson.D{{Key: "expires_at", Value: 1}},
		Options: options.Index().SetExpireAfterSeconds(0),
	}
	_, err = sharedTripsCollection.Indexes().CreateOne(ctx, expiresIndex)
	if err != nil {
		return err
	}

	log.Println("All database indexes created successfully")
	return nil
}
