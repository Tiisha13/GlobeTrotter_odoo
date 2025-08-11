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

type StopRepository struct {
	db         *mongo.Database
	collection *mongo.Collection
}

func NewStopRepository(db *mongo.Database) *StopRepository {
	return &StopRepository{
		db:         db,
		collection: db.Collection("stops"),
	}
}

func (r *StopRepository) Create(ctx context.Context, stop *models.Stop) error {
	stop.ID = primitive.NewObjectID()

	_, err := r.collection.InsertOne(ctx, stop)
	if err != nil {
		return fmt.Errorf("failed to create stop: %w", err)
	}

	return nil
}

func (r *StopRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Stop, error) {
	var stop models.Stop
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&stop)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to get stop by ID: %w", err)
	}

	return &stop, nil
}

func (r *StopRepository) GetByTripID(ctx context.Context, tripID primitive.ObjectID) ([]*models.Stop, error) {
	cursor, err := r.collection.Find(
		ctx,
		bson.M{"trip_id": tripID},
		options.Find().SetSort(bson.D{{Key: "order", Value: 1}}),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get stops by trip ID: %w", err)
	}
	defer cursor.Close(ctx)

	var stops []*models.Stop
	if err = cursor.All(ctx, &stops); err != nil {
		return nil, fmt.Errorf("failed to decode stops: %w", err)
	}

	return stops, nil
}

func (r *StopRepository) Update(ctx context.Context, id primitive.ObjectID, update bson.M) error {
	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": update},
	)
	if err != nil {
		return fmt.Errorf("failed to update stop: %w", err)
	}

	if result.MatchedCount == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *StopRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	result, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return fmt.Errorf("failed to delete stop: %w", err)
	}

	if result.DeletedCount == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *StopRepository) ReorderStops(ctx context.Context, tripID primitive.ObjectID, stopOrders []struct {
	StopID primitive.ObjectID `json:"stop_id"`
	Order  int                `json:"order"`
}) error {
	session, err := r.db.Client().StartSession()
	if err != nil {
		return fmt.Errorf("failed to start session: %w", err)
	}
	defer session.EndSession(ctx)

	err = mongo.WithSession(ctx, session, func(sc mongo.SessionContext) error {
		for _, stopOrder := range stopOrders {
			_, err := r.collection.UpdateOne(
				sc,
				bson.M{"_id": stopOrder.StopID, "trip_id": tripID},
				bson.M{"$set": bson.M{"order": stopOrder.Order}},
			)
			if err != nil {
				return fmt.Errorf("failed to update stop order: %w", err)
			}
		}
		return nil
	})

	if err != nil {
		return fmt.Errorf("failed to reorder stops: %w", err)
	}

	return nil
}

func (r *StopRepository) GetNextOrder(ctx context.Context, tripID primitive.ObjectID) (int, error) {
	pipeline := []bson.M{
		{"$match": bson.M{"trip_id": tripID}},
		{"$group": bson.M{
			"_id":       nil,
			"max_order": bson.M{"$max": "$order"},
		}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return 0, fmt.Errorf("failed to get max order: %w", err)
	}
	defer cursor.Close(ctx)

	var result struct {
		MaxOrder *int `bson:"max_order"`
	}

	if cursor.Next(ctx) {
		if err := cursor.Decode(&result); err != nil {
			return 0, fmt.Errorf("failed to decode max order: %w", err)
		}
	}

	if result.MaxOrder == nil {
		return 1, nil
	}

	return *result.MaxOrder + 1, nil
}
