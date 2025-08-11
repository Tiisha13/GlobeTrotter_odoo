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

type ItineraryRepository struct {
	db         *mongo.Database
	collection *mongo.Collection
}

func NewItineraryRepository(db *mongo.Database) *ItineraryRepository {
	return &ItineraryRepository{
		db:         db,
		collection: db.Collection("itinerary_items"),
	}
}

func (r *ItineraryRepository) Create(ctx context.Context, item *models.ItineraryItem) error {
	item.ID = primitive.NewObjectID()

	_, err := r.collection.InsertOne(ctx, item)
	if err != nil {
		return fmt.Errorf("failed to create itinerary item: %w", err)
	}

	return nil
}

func (r *ItineraryRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.ItineraryItem, error) {
	var item models.ItineraryItem
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&item)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to get itinerary item by ID: %w", err)
	}

	return &item, nil
}

func (r *ItineraryRepository) GetByStopID(ctx context.Context, stopID primitive.ObjectID) ([]*models.ItineraryItem, error) {
	cursor, err := r.collection.Find(
		ctx,
		bson.M{"stop_id": stopID},
		options.Find().SetSort(bson.D{{Key: "day", Value: 1}, {Key: "order", Value: 1}}),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get itinerary items by stop ID: %w", err)
	}
	defer cursor.Close(ctx)

	var items []*models.ItineraryItem
	if err = cursor.All(ctx, &items); err != nil {
		return nil, fmt.Errorf("failed to decode itinerary items: %w", err)
	}

	return items, nil
}

func (r *ItineraryRepository) Update(ctx context.Context, id primitive.ObjectID, update bson.M) error {
	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": update},
	)
	if err != nil {
		return fmt.Errorf("failed to update itinerary item: %w", err)
	}

	if result.MatchedCount == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *ItineraryRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	result, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return fmt.Errorf("failed to delete itinerary item: %w", err)
	}

	if result.DeletedCount == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *ItineraryRepository) ReorderItems(ctx context.Context, stopID primitive.ObjectID, day int, itemOrders []struct {
	ItemID primitive.ObjectID `json:"item_id"`
	Order  int                `json:"order"`
}) error {
	session, err := r.db.Client().StartSession()
	if err != nil {
		return fmt.Errorf("failed to start session: %w", err)
	}
	defer session.EndSession(ctx)

	err = mongo.WithSession(ctx, session, func(sc mongo.SessionContext) error {
		for _, itemOrder := range itemOrders {
			_, err := r.collection.UpdateOne(
				sc,
				bson.M{"_id": itemOrder.ItemID, "stop_id": stopID, "day": day},
				bson.M{"$set": bson.M{"order": itemOrder.Order}},
			)
			if err != nil {
				return fmt.Errorf("failed to update item order: %w", err)
			}
		}
		return nil
	})

	if err != nil {
		return fmt.Errorf("failed to reorder items: %w", err)
	}

	return nil
}

func (r *ItineraryRepository) GetByTripIDGroupedByDay(ctx context.Context, tripID primitive.ObjectID) (map[int][]*models.ItineraryItem, error) {
	// First get all stops for the trip
	stopsCollection := r.db.Collection("stops")
	stopsCursor, err := stopsCollection.Find(ctx, bson.M{"trip_id": tripID})
	if err != nil {
		return nil, fmt.Errorf("failed to get stops: %w", err)
	}
	defer stopsCursor.Close(ctx)

	var stopIDs []primitive.ObjectID
	for stopsCursor.Next(ctx) {
		var stop models.Stop
		if err := stopsCursor.Decode(&stop); err != nil {
			return nil, fmt.Errorf("failed to decode stop: %w", err)
		}
		stopIDs = append(stopIDs, stop.ID)
	}

	if len(stopIDs) == 0 {
		return make(map[int][]*models.ItineraryItem), nil
	}

	// Get all itinerary items for these stops
	cursor, err := r.collection.Find(
		ctx,
		bson.M{"stop_id": bson.M{"$in": stopIDs}},
		options.Find().SetSort(bson.D{{Key: "day", Value: 1}, {Key: "order", Value: 1}}),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get itinerary items: %w", err)
	}
	defer cursor.Close(ctx)

	var items []*models.ItineraryItem
	if err = cursor.All(ctx, &items); err != nil {
		return nil, fmt.Errorf("failed to decode itinerary items: %w", err)
	}

	// Group by day
	grouped := make(map[int][]*models.ItineraryItem)
	for _, item := range items {
		grouped[item.Day] = append(grouped[item.Day], item)
	}

	return grouped, nil
}

type SharedTripRepository struct {
	db         *mongo.Database
	collection *mongo.Collection
}

func NewSharedTripRepository(db *mongo.Database) *SharedTripRepository {
	return &SharedTripRepository{
		db:         db,
		collection: db.Collection("shared_trips"),
	}
}

func (r *SharedTripRepository) Create(ctx context.Context, sharedTrip *models.SharedTrip) error {
	_, err := r.collection.InsertOne(ctx, sharedTrip)
	if err != nil {
		return fmt.Errorf("failed to create shared trip: %w", err)
	}

	return nil
}

func (r *SharedTripRepository) GetByToken(ctx context.Context, token string) (*models.SharedTrip, error) {
	var sharedTrip models.SharedTrip
	err := r.collection.FindOne(ctx, bson.M{"share_token": token}).Decode(&sharedTrip)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to get shared trip by token: %w", err)
	}

	return &sharedTrip, nil
}

func (r *SharedTripRepository) DeleteByTripID(ctx context.Context, tripID primitive.ObjectID) error {
	_, err := r.collection.DeleteMany(ctx, bson.M{"trip_id": tripID})
	if err != nil {
		return fmt.Errorf("failed to delete shared trips: %w", err)
	}

	return nil
}
