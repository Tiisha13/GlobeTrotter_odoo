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

type UserRepository struct{}

func NewUserRepository() *UserRepository {
	return &UserRepository{}
}

func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	user.ID = primitive.NewObjectID()
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	user.IsActive = true
	user.Role = models.UserRoleUser

	collection := config.MongoDB.Collection("users")
	_, err := collection.InsertOne(ctx, user)
	return err
}

func (r *UserRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	var user models.User
	collection := config.MongoDB.Collection("users")

	err := collection.FindOne(ctx, bson.M{"_id": id, "is_active": true}).Decode(&user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	collection := config.MongoDB.Collection("users")

	err := collection.FindOne(ctx, bson.M{"email": email, "is_active": true}).Decode(&user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *UserRepository) Update(ctx context.Context, id primitive.ObjectID, update bson.M) error {
	update["updated_at"] = time.Now()

	collection := config.MongoDB.Collection("users")
	_, err := collection.UpdateOne(
		ctx,
		bson.M{"_id": id, "is_active": true},
		bson.M{"$set": update},
	)
	return err
}

func (r *UserRepository) UpdateLastLogin(ctx context.Context, id primitive.ObjectID) error {
	now := time.Now()
	return r.Update(ctx, id, bson.M{"last_login_at": now})
}

func (r *UserRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	// Soft delete
	return r.Update(ctx, id, bson.M{"is_active": false})
}

func (r *UserRepository) List(ctx context.Context, page, limit int) ([]models.User, int64, error) {
	collection := config.MongoDB.Collection("users")

	filter := bson.M{"is_active": true}

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

	var users []models.User
	if err = cursor.All(ctx, &users); err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func (r *UserRepository) Exists(ctx context.Context, email string) (bool, error) {
	collection := config.MongoDB.Collection("users")

	count, err := collection.CountDocuments(ctx, bson.M{"email": email})
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (r *UserRepository) GetStats(ctx context.Context) (int64, error) {
	collection := config.MongoDB.Collection("users")
	return collection.CountDocuments(ctx, bson.M{"is_active": true})
}
