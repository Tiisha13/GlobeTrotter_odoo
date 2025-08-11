package repositories

import (
	"context"
	"time"

	"globetrotter/config"
	"globetrotter/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type TripRepository struct{}

func NewTripRepository() *TripRepository {
	return &TripRepository{}
}

func (r *TripRepository) Create(ctx context.Context, trip *models.Trip) error {
	trip.ID = primitive.NewObjectID()
	trip.CreatedAt = time.Now()
	trip.UpdatedAt = time.Now()
	trip.ViewCount = 0

	collection := config.MongoDB.Collection("trips")
	_, err := collection.InsertOne(ctx, trip)
	return err
}

func (r *TripRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Trip, error) {
	var trip models.Trip
	collection := config.MongoDB.Collection("trips")

	err := collection.FindOne(ctx, bson.M{"_id": id}).Decode(&trip)
	if err != nil {
		return nil, err
	}

	return &trip, nil
}

func (r *TripRepository) GetByShareToken(ctx context.Context, shareToken string) (*models.Trip, error) {
	var trip models.Trip
	collection := config.MongoDB.Collection("trips")

	err := collection.FindOne(ctx, bson.M{"share_token": shareToken, "is_public": true}).Decode(&trip)
	if err != nil {
		return nil, err
	}

	return &trip, nil
}

func (r *TripRepository) Update(ctx context.Context, id primitive.ObjectID, update bson.M) error {
	update["updated_at"] = time.Now()

	collection := config.MongoDB.Collection("trips")
	_, err := collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": update},
	)
	return err
}

func (r *TripRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	collection := config.MongoDB.Collection("trips")
	_, err := collection.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (r *TripRepository) GetUserTrips(ctx context.Context, userID primitive.ObjectID, page, limit int) ([]models.Trip, int64, error) {
	collection := config.MongoDB.Collection("trips")

	filter := bson.M{"user_id": userID}

	// Count total documents
	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	// Calculate skip
	skip := (page - 1) * limit

	// Find documents with pagination
	opts := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(limit)).
		SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var trips []models.Trip
	if err = cursor.All(ctx, &trips); err != nil {
		return nil, 0, err
	}

	return trips, total, nil
}

func (r *TripRepository) GetPublicTrips(ctx context.Context, page, limit int) ([]models.Trip, int64, error) {
	collection := config.MongoDB.Collection("trips")

	filter := bson.M{"is_public": true}

	// Count total documents
	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	// Calculate skip
	skip := (page - 1) * limit

	// Find documents with pagination
	opts := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(limit)).
		SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var trips []models.Trip
	if err = cursor.All(ctx, &trips); err != nil {
		return nil, 0, err
	}

	return trips, total, nil
}

func (r *TripRepository) GetAllTrips(ctx context.Context, page, limit int) ([]models.Trip, int64, error) {
	collection := config.MongoDB.Collection("trips")

	filter := bson.M{}

	// Count total documents
	total, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	// Calculate skip
	skip := (page - 1) * limit

	// Find documents with pagination
	opts := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(limit)).
		SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var trips []models.Trip
	if err = cursor.All(ctx, &trips); err != nil {
		return nil, 0, err
	}

	return trips, total, nil
}

func (r *TripRepository) IncrementViewCount(ctx context.Context, id primitive.ObjectID) error {
	collection := config.MongoDB.Collection("trips")
	_, err := collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$inc": bson.M{"view_count": 1}},
	)
	return err
}

func (r *TripRepository) GetStats(ctx context.Context) (int64, error) {
	collection := config.MongoDB.Collection("trips")
	return collection.CountDocuments(ctx, bson.M{})
}

func (r *TripRepository) GetTopCities(ctx context.Context, limit int) ([]bson.M, error) {
	collection := config.MongoDB.Collection("stops")

	pipeline := []bson.M{
		{
			"$group": bson.M{
				"_id":   "$city",
				"count": bson.M{"$sum": 1},
			},
		},
		{
			"$sort": bson.M{"count": -1},
		},
		{
			"$limit": limit,
		},
		{
			"$project": bson.M{
				"city":  "$_id",
				"count": 1,
				"_id":   0,
			},
		},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err = cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	return results, nil
}

func (r *TripRepository) GetAverageBudget(ctx context.Context) (float64, error) {
	collection := config.MongoDB.Collection("trips")

	pipeline := []bson.M{
		{
			"$match": bson.M{
				"total_budget": bson.M{"$gt": 0},
			},
		},
		{
			"$group": bson.M{
				"_id":            nil,
				"average_budget": bson.M{"$avg": "$total_budget"},
			},
		},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	var result []bson.M
	if err = cursor.All(ctx, &result); err != nil {
		return 0, err
	}

	if len(result) == 0 {
		return 0, nil
	}

	avgBudget, ok := result[0]["average_budget"].(float64)
	if !ok {
		return 0, nil
	}

	return avgBudget, nil
}
