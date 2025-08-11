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

type ActivityRepository struct{}

func NewActivityRepository() *ActivityRepository {
	return &ActivityRepository{}
}

func (r *ActivityRepository) Create(ctx context.Context, activity *models.Activity) error {
	activity.ID = primitive.NewObjectID()
	activity.CreatedAt = time.Now()
	activity.UpdatedAt = time.Now()

	collection := config.MongoDB.Collection("activities")
	_, err := collection.InsertOne(ctx, activity)
	return err
}

func (r *ActivityRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Activity, error) {
	var activity models.Activity
	collection := config.MongoDB.Collection("activities")

	err := collection.FindOne(ctx, bson.M{"_id": id}).Decode(&activity)
	if err != nil {
		return nil, err
	}

	return &activity, nil
}

func (r *ActivityRepository) Update(ctx context.Context, id primitive.ObjectID, update bson.M) error {
	update["updated_at"] = time.Now()

	collection := config.MongoDB.Collection("activities")
	_, err := collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": update},
	)
	return err
}

func (r *ActivityRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	collection := config.MongoDB.Collection("activities")
	_, err := collection.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (r *ActivityRepository) GetStopActivities(ctx context.Context, stopID primitive.ObjectID) ([]models.Activity, error) {
	collection := config.MongoDB.Collection("activities")

	opts := options.Find().SetSort(bson.D{{Key: "day_offset", Value: 1}, {Key: "start_time", Value: 1}})
	cursor, err := collection.Find(ctx, bson.M{"stop_id": stopID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var activities []models.Activity
	if err = cursor.All(ctx, &activities); err != nil {
		return nil, err
	}

	return activities, nil
}

func (r *ActivityRepository) CountByStop(ctx context.Context, stopID primitive.ObjectID) (int64, error) {
	collection := config.MongoDB.Collection("activities")
	return collection.CountDocuments(ctx, bson.M{"stop_id": stopID})
}

func (r *ActivityRepository) GetByCategory(ctx context.Context, stopID primitive.ObjectID, category models.ActivityCategory) ([]models.Activity, error) {
	collection := config.MongoDB.Collection("activities")

	filter := bson.M{
		"stop_id":  stopID,
		"category": category,
	}

	opts := options.Find().SetSort(bson.D{{Key: "day_offset", Value: 1}, {Key: "start_time", Value: 1}})
	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var activities []models.Activity
	if err = cursor.All(ctx, &activities); err != nil {
		return nil, err
	}

	return activities, nil
}

func (r *ActivityRepository) GetByDay(ctx context.Context, stopID primitive.ObjectID, dayOffset int) ([]models.Activity, error) {
	collection := config.MongoDB.Collection("activities")

	filter := bson.M{
		"stop_id":    stopID,
		"day_offset": dayOffset,
	}

	opts := options.Find().SetSort(bson.D{{Key: "start_time", Value: 1}})
	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var activities []models.Activity
	if err = cursor.All(ctx, &activities); err != nil {
		return nil, err
	}

	return activities, nil
}

func (r *ActivityRepository) GetTotalCost(ctx context.Context, stopID primitive.ObjectID, currency string) (float64, error) {
	collection := config.MongoDB.Collection("activities")

	pipeline := []bson.M{
		{
			"$match": bson.M{
				"stop_id":  stopID,
				"currency": currency,
			},
		},
		{
			"$group": bson.M{
				"_id":        nil,
				"total_cost": bson.M{"$sum": "$cost"},
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

	totalCost, ok := result[0]["total_cost"].(float64)
	if !ok {
		return 0, nil
	}

	return totalCost, nil
}

func (r *ActivityRepository) GetStats(ctx context.Context) (int64, error) {
	collection := config.MongoDB.Collection("activities")
	return collection.CountDocuments(ctx, bson.M{})
}

func (r *ActivityRepository) DeleteByStop(ctx context.Context, stopID primitive.ObjectID) error {
	collection := config.MongoDB.Collection("activities")
	_, err := collection.DeleteMany(ctx, bson.M{"stop_id": stopID})
	return err
}

func (r *ActivityRepository) DeleteByTrip(ctx context.Context, tripID primitive.ObjectID) error {
	// First get all stops for the trip
	stopRepo := NewStopRepository()
	stops, err := stopRepo.GetTripStops(ctx, tripID)
	if err != nil {
		return err
	}

	// Delete activities for each stop
	collection := config.MongoDB.Collection("activities")
	for _, stop := range stops {
		_, err := collection.DeleteMany(ctx, bson.M{"stop_id": stop.ID})
		if err != nil {
			return err
		}
	}

	return nil
}
