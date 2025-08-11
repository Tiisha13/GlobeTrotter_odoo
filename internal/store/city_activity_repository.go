package store

import (
	"context"
	"fmt"

	"globetrotter/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type CityRepository struct {
	db         *mongo.Database
	collection *mongo.Collection
}

func NewCityRepository(db *mongo.Database) *CityRepository {
	return &CityRepository{
		db:         db,
		collection: db.Collection("cities"),
	}
}

func (r *CityRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.City, error) {
	var city models.City
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&city)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to get city by ID: %w", err)
	}

	return &city, nil
}

func (r *CityRepository) Search(ctx context.Context, query string, limit int) ([]*models.City, error) {
	filter := bson.M{
		"$or": []bson.M{
			{"name": bson.M{"$regex": query, "$options": "i"}},
			{"country": bson.M{"$regex": query, "$options": "i"}},
		},
	}

	cursor, err := r.collection.Find(
		ctx,
		filter,
		options.Find().SetLimit(int64(limit)).SetSort(bson.D{{Key: "popularity", Value: -1}}),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to search cities: %w", err)
	}
	defer cursor.Close(ctx)

	var cities []*models.City
	if err = cursor.All(ctx, &cities); err != nil {
		return nil, fmt.Errorf("failed to decode cities: %w", err)
	}

	return cities, nil
}

func (r *CityRepository) GetPopular(ctx context.Context, limit int) ([]*models.City, error) {
	cursor, err := r.collection.Find(
		ctx,
		bson.M{},
		options.Find().SetLimit(int64(limit)).SetSort(bson.D{{Key: "popularity", Value: -1}}),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get popular cities: %w", err)
	}
	defer cursor.Close(ctx)

	var cities []*models.City
	if err = cursor.All(ctx, &cities); err != nil {
		return nil, fmt.Errorf("failed to decode cities: %w", err)
	}

	return cities, nil
}

type ActivityRepository struct {
	db         *mongo.Database
	collection *mongo.Collection
}

func NewActivityRepository(db *mongo.Database) *ActivityRepository {
	return &ActivityRepository{
		db:         db,
		collection: db.Collection("activities"),
	}
}

func (r *ActivityRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Activity, error) {
	var activity models.Activity
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&activity)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to get activity by ID: %w", err)
	}

	return &activity, nil
}

func (r *ActivityRepository) GetByCityID(ctx context.Context, cityID primitive.ObjectID, activityType string, limit int) ([]*models.Activity, error) {
	filter := bson.M{"city_id": cityID}
	if activityType != "" {
		filter["type"] = activityType
	}

	cursor, err := r.collection.Find(
		ctx,
		filter,
		options.Find().SetLimit(int64(limit)).SetSort(bson.D{{Key: "popularity", Value: -1}}),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get activities by city: %w", err)
	}
	defer cursor.Close(ctx)

	var activities []*models.Activity
	if err = cursor.All(ctx, &activities); err != nil {
		return nil, fmt.Errorf("failed to decode activities: %w", err)
	}

	return activities, nil
}

func (r *ActivityRepository) Search(ctx context.Context, cityID primitive.ObjectID, query string, activityType string, limit int) ([]*models.Activity, error) {
	filter := bson.M{"city_id": cityID}

	if query != "" {
		filter["$or"] = []bson.M{
			{"title": bson.M{"$regex": query, "$options": "i"}},
			{"description": bson.M{"$regex": query, "$options": "i"}},
			{"tags": bson.M{"$in": []string{query}}},
		}
	}

	if activityType != "" {
		filter["type"] = activityType
	}

	cursor, err := r.collection.Find(
		ctx,
		filter,
		options.Find().SetLimit(int64(limit)).SetSort(bson.D{{Key: "popularity", Value: -1}}),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to search activities: %w", err)
	}
	defer cursor.Close(ctx)

	var activities []*models.Activity
	if err = cursor.All(ctx, &activities); err != nil {
		return nil, fmt.Errorf("failed to decode activities: %w", err)
	}

	return activities, nil
}
