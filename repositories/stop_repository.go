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

type StopRepository struct{}

func NewStopRepository() *StopRepository {
	return &StopRepository{}
}

func (r *StopRepository) Create(ctx context.Context, stop *models.Stop) error {
	stop.ID = primitive.NewObjectID()
	stop.CreatedAt = time.Now()
	stop.UpdatedAt = time.Now()
	stop.UpdateLocation() // Set GeoJSON location

	collection := config.MongoDB.Collection("stops")
	_, err := collection.InsertOne(ctx, stop)
	return err
}

func (r *StopRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Stop, error) {
	var stop models.Stop
	collection := config.MongoDB.Collection("stops")

	err := collection.FindOne(ctx, bson.M{"_id": id}).Decode(&stop)
	if err != nil {
		return nil, err
	}

	return &stop, nil
}

func (r *StopRepository) Update(ctx context.Context, id primitive.ObjectID, update bson.M) error {
	update["updated_at"] = time.Now()

	collection := config.MongoDB.Collection("stops")
	_, err := collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": update},
	)
	return err
}

func (r *StopRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	collection := config.MongoDB.Collection("stops")
	_, err := collection.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (r *StopRepository) GetTripStops(ctx context.Context, tripID primitive.ObjectID) ([]models.Stop, error) {
	collection := config.MongoDB.Collection("stops")

	opts := options.Find().SetSort(bson.D{{Key: "position", Value: 1}})
	cursor, err := collection.Find(ctx, bson.M{"trip_id": tripID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var stops []models.Stop
	if err = cursor.All(ctx, &stops); err != nil {
		return nil, err
	}

	return stops, nil
}

func (r *StopRepository) UpdatePositions(ctx context.Context, tripID primitive.ObjectID, stopPositions []struct {
	ID       primitive.ObjectID
	Position int
}) error {
	collection := config.MongoDB.Collection("stops")

	for _, sp := range stopPositions {
		_, err := collection.UpdateOne(
			ctx,
			bson.M{"_id": sp.ID, "trip_id": tripID},
			bson.M{"$set": bson.M{"position": sp.Position, "updated_at": time.Now()}},
		)
		if err != nil {
			return err
		}
	}

	return nil
}

func (r *StopRepository) GetByTripAndPosition(ctx context.Context, tripID primitive.ObjectID, position int) (*models.Stop, error) {
	var stop models.Stop
	collection := config.MongoDB.Collection("stops")

	err := collection.FindOne(ctx, bson.M{"trip_id": tripID, "position": position}).Decode(&stop)
	if err != nil {
		return nil, err
	}

	return &stop, nil
}

func (r *StopRepository) CountByTrip(ctx context.Context, tripID primitive.ObjectID) (int64, error) {
	collection := config.MongoDB.Collection("stops")
	return collection.CountDocuments(ctx, bson.M{"trip_id": tripID})
}

func (r *StopRepository) GetNearbyStops(ctx context.Context, lat, lng float64, maxDistance float64) ([]models.Stop, error) {
	collection := config.MongoDB.Collection("stops")

	filter := bson.M{
		"location": bson.M{
			"$near": bson.M{
				"$geometry": bson.M{
					"type":        "Point",
					"coordinates": []float64{lng, lat},
				},
				"$maxDistance": maxDistance, // meters
			},
		},
	}

	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var stops []models.Stop
	if err = cursor.All(ctx, &stops); err != nil {
		return nil, err
	}

	return stops, nil
}

func (r *StopRepository) GetStats(ctx context.Context) (int64, error) {
	collection := config.MongoDB.Collection("stops")
	return collection.CountDocuments(ctx, bson.M{})
}

func (r *StopRepository) DeleteByTrip(ctx context.Context, tripID primitive.ObjectID) error {
	collection := config.MongoDB.Collection("stops")
	_, err := collection.DeleteMany(ctx, bson.M{"trip_id": tripID})
	return err
}
