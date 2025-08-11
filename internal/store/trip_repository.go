package store

import (
	"context"
	"fmt"
	"time"

	"globetrotter/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type TripRepository struct {
	db         *mongo.Database
	collection *mongo.Collection
}

func NewTripRepository(db *mongo.Database) *TripRepository {
	return &TripRepository{
		db:         db,
		collection: db.Collection("trips"),
	}
}

func (r *TripRepository) Create(ctx context.Context, trip *models.Trip) error {
	trip.ID = primitive.NewObjectID()
	trip.CreatedAt = time.Now()
	trip.UpdatedAt = time.Now()

	_, err := r.collection.InsertOne(ctx, trip)
	if err != nil {
		return fmt.Errorf("failed to create trip: %w", err)
	}

	return nil
}

func (r *TripRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Trip, error) {
	var trip models.Trip
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&trip)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to get trip by ID: %w", err)
	}

	return &trip, nil
}

func (r *TripRepository) GetByOwnerID(ctx context.Context, ownerID primitive.ObjectID, page, limit int) ([]*models.Trip, int64, error) {
	skip := (page - 1) * limit
	filter := bson.M{"owner_id": ownerID}

	cursor, err := r.collection.Find(
		ctx,
		filter,
		options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}}),
	)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get trips by owner: %w", err)
	}
	defer cursor.Close(ctx)

	var trips []*models.Trip
	if err = cursor.All(ctx, &trips); err != nil {
		return nil, 0, fmt.Errorf("failed to decode trips: %w", err)
	}

	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count trips: %w", err)
	}

	return trips, total, nil
}

func (r *TripRepository) GetPublicTrips(ctx context.Context, page, limit int) ([]*models.Trip, int64, error) {
	skip := (page - 1) * limit
	filter := bson.M{"privacy": "public"}

	cursor, err := r.collection.Find(
		ctx,
		filter,
		options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}}),
	)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get public trips: %w", err)
	}
	defer cursor.Close(ctx)

	var trips []*models.Trip
	if err = cursor.All(ctx, &trips); err != nil {
		return nil, 0, fmt.Errorf("failed to decode trips: %w", err)
	}

	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count trips: %w", err)
	}

	return trips, total, nil
}

func (r *TripRepository) Update(ctx context.Context, id primitive.ObjectID, update bson.M) error {
	update["updated_at"] = time.Now()

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": update},
	)
	if err != nil {
		return fmt.Errorf("failed to update trip: %w", err)
	}

	if result.MatchedCount == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *TripRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	result, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return fmt.Errorf("failed to delete trip: %w", err)
	}

	if result.DeletedCount == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *TripRepository) Duplicate(ctx context.Context, originalID, newOwnerID primitive.ObjectID, newName string) (*models.Trip, error) {
	original, err := r.GetByID(ctx, originalID)
	if err != nil {
		return nil, fmt.Errorf("failed to get original trip: %w", err)
	}

	newTrip := &models.Trip{
		OwnerID:       newOwnerID,
		Name:          newName,
		StartDate:     original.StartDate,
		EndDate:       original.EndDate,
		Description:   original.Description,
		CoverPhotoURL: original.CoverPhotoURL,
		Privacy:       "private", // Duplicated trips are private by default
	}

	err = r.Create(ctx, newTrip)
	if err != nil {
		return nil, fmt.Errorf("failed to create duplicate trip: %w", err)
	}

	return newTrip, nil
}

func (r *TripRepository) IsOwner(ctx context.Context, tripID, userID primitive.ObjectID) (bool, error) {
	count, err := r.collection.CountDocuments(ctx, bson.M{
		"_id":      tripID,
		"owner_id": userID,
	})
	if err != nil {
		return false, fmt.Errorf("failed to check ownership: %w", err)
	}
	return count > 0, nil
}

func (r *TripRepository) List(ctx context.Context, page, limit int) ([]*models.Trip, int64, error) {
	skip := (page - 1) * limit

	cursor, err := r.collection.Find(
		ctx,
		bson.M{},
		options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}}),
	)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list trips: %w", err)
	}
	defer cursor.Close(ctx)

	var trips []*models.Trip
	if err = cursor.All(ctx, &trips); err != nil {
		return nil, 0, fmt.Errorf("failed to decode trips: %w", err)
	}

	total, err := r.collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count trips: %w", err)
	}

	return trips, total, nil
}
