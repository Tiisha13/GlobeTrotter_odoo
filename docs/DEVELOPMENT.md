# GlobeTrotter API Development Guide

## Project Overview

GlobeTrotter is a production-ready travel planning backend API built with modern Go practices. It provides comprehensive user management, trip planning, and sharing capabilities with horizontal scaling support.

## Architecture

### Clean Architecture Structure

The project follows Go's clean architecture principles with clear separation of concerns:

```
internal/
├── api/          # HTTP handlers and routing logic
├── auth/         # JWT authentication service
├── cache/        # Redis caching layer
├── config/       # Configuration management
├── middleware/   # HTTP middleware (auth, CORS, rate limiting)
├── models/       # Data models and DTOs
├── service/      # Business logic layer
└── store/        # Data persistence layer (repositories)
```

### Data Flow

1. **HTTP Request** → `api/handlers.go`
2. **Authentication** → `middleware/middleware.go`
3. **Business Logic** → `service/*.go`
4. **Data Access** → `store/*_repository.go`
5. **Database/Cache** → MongoDB/Redis

## Development Setup

### Prerequisites

- Go 1.23 or higher
- Docker and Docker Compose
- Git

### Environment Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd globe-trotter
```

2. Copy environment configuration:

```bash
cp .env.example .env
```

3. Update `.env` with your settings:

```env
# Required settings
JWT_SECRET=your-super-secret-jwt-key-here
MONGO_URI=mongodb://localhost:27017
REDIS_ADDR=localhost:6379

# Optional settings (have defaults)
PORT=8080
ENVIRONMENT=development
```

4. Start development services:

```bash
docker-compose up -d mongo redis
```

5. Install Go dependencies:

```bash
go mod download
```

6. Run the application:

```bash
go run cmd/server/main.go
```

### Development with Docker

For a complete development environment with all services:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop all services
docker-compose down
```

## Code Organization

### Adding New Features

#### 1. Data Models

Add new models to `internal/models/models.go`:

```go
// Example: Adding a new Stop model
type Stop struct {
    ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
    TripID      primitive.ObjectID `json:"trip_id" bson:"trip_id"`
    Title       string             `json:"title" bson:"title" validate:"required,min=1,max=200"`
    Description string             `json:"description" bson:"description"`
    Location    Location           `json:"location" bson:"location"`
    Order       int                `json:"order" bson:"order"`
    CreatedAt   time.Time          `json:"created_at" bson:"created_at"`
    UpdatedAt   time.Time          `json:"updated_at" bson:"updated_at"`
}

// Request/Response DTOs
type CreateStopRequest struct {
    TripID      string   `json:"trip_id" validate:"required"`
    Title       string   `json:"title" validate:"required,min=1,max=200"`
    Description string   `json:"description"`
    Location    Location `json:"location"`
    Order       int      `json:"order"`
}
```

#### 2. Repository Layer

Create repository in `internal/store/`:

```go
// internal/store/stop_repository.go
package store

type StopRepository struct {
    db *mongo.Database
}

func NewStopRepository(db *mongo.Database) *StopRepository {
    return &StopRepository{db: db}
}

func (r *StopRepository) Create(ctx context.Context, stop *models.Stop) error {
    collection := r.db.Collection("stops")
    stop.ID = primitive.NewObjectID()
    stop.CreatedAt = time.Now()
    stop.UpdatedAt = time.Now()

    _, err := collection.InsertOne(ctx, stop)
    return err
}

func (r *StopRepository) GetByTripID(ctx context.Context, tripID primitive.ObjectID) ([]*models.Stop, error) {
    collection := r.db.Collection("stops")

    filter := bson.M{"trip_id": tripID}
    cursor, err := collection.Find(ctx, filter)
    if err != nil {
        return nil, err
    }
    defer cursor.Close(ctx)

    var stops []*models.Stop
    if err = cursor.All(ctx, &stops); err != nil {
        return nil, err
    }

    return stops, nil
}
```

#### 3. Service Layer

Create service in `internal/service/`:

```go
// internal/service/stop_service.go
package service

type StopService struct {
    stopRepo    *store.StopRepository
    tripRepo    *store.TripRepository
    cacheService *cache.CacheService
    config      *config.Config
}

func NewStopService(stopRepo *store.StopRepository, tripRepo *store.TripRepository,
                   cacheService *cache.CacheService, config *config.Config) *StopService {
    return &StopService{
        stopRepo:     stopRepo,
        tripRepo:     tripRepo,
        cacheService: cacheService,
        config:       config,
    }
}

func (s *StopService) CreateStop(ctx context.Context, req *models.CreateStopRequest, userID primitive.ObjectID) (*models.Stop, error) {
    // Validate trip ownership
    tripID, err := primitive.ObjectIDFromHex(req.TripID)
    if err != nil {
        return nil, errors.New("invalid trip ID")
    }

    trip, err := s.tripRepo.GetByID(ctx, tripID)
    if err != nil {
        return nil, err
    }

    if trip.OwnerID != userID {
        return nil, errors.New("unauthorized")
    }

    // Create stop
    stop := &models.Stop{
        TripID:      tripID,
        Title:       req.Title,
        Description: req.Description,
        Location:    req.Location,
        Order:       req.Order,
    }

    if err := s.stopRepo.Create(ctx, stop); err != nil {
        return nil, err
    }

    // Invalidate cache
    cacheKey := fmt.Sprintf("trip_stops:%s", req.TripID)
    s.cacheService.Delete(ctx, cacheKey)

    return stop, nil
}
```

#### 4. HTTP Handlers

Create handlers in `internal/api/handlers.go`:

```go
// Add to existing handlers.go file

type StopHandler struct {
    stopService *service.StopService
}

func NewStopHandler(stopService *service.StopService) *StopHandler {
    return &StopHandler{stopService: stopService}
}

// CreateStop creates a new stop for a trip
// @Summary Create stop
// @Description Creates a new stop for a specific trip
// @Tags Stops
// @Accept json
// @Produce json
// @Param stop body models.CreateStopRequest true "Stop data"
// @Success 201 {object} models.APIResponse{data=models.Stop}
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /stops [post]
func (h *StopHandler) CreateStop(c *fiber.Ctx) error {
    var req models.CreateStopRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
            Success: false,
            Error:   "Invalid request body",
        })
    }

    // Get user ID from context (set by auth middleware)
    userID := c.Locals("userID").(primitive.ObjectID)

    stop, err := h.stopService.CreateStop(context.Background(), &req, userID)
    if err != nil {
        if err.Error() == "unauthorized" {
            return c.Status(fiber.StatusForbidden).JSON(models.APIResponse{
                Success: false,
                Error:   "Access denied",
            })
        }
        return c.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
            Success: false,
            Error:   "Failed to create stop",
        })
    }

    return c.Status(fiber.StatusCreated).JSON(models.APIResponse{
        Success: true,
        Message: "Stop created successfully",
        Data:    stop,
    })
}
```

#### 5. Update Routes

Add routes in `cmd/server/main.go`:

```go
// In setupRoutes function
func setupRoutes(app *fiber.App, userHandler *api.UserHandler, tripHandler *api.TripHandler,
                stopHandler *api.StopHandler, mw *middleware.Middleware) {
    // ... existing routes ...

    // Stop routes
    stops := api.Group("/stops")
    stops.Use(mw.AuthRequired())
    stops.Post("/", stopHandler.CreateStop)
    stops.Get("/trip/:tripId", stopHandler.GetTripStops)
    stops.Get("/:id", stopHandler.GetStop)
    stops.Put("/:id", stopHandler.UpdateStop)
    stops.Delete("/:id", stopHandler.DeleteStop)
}
```

### Testing

#### Unit Tests

Create test files alongside source files:

```go
// internal/service/stop_service_test.go
package service

import (
    "context"
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

func TestStopService_CreateStop(t *testing.T) {
    // Setup mocks
    stopRepo := &mocks.StopRepository{}
    tripRepo := &mocks.TripRepository{}
    cacheService := &mocks.CacheService{}

    service := NewStopService(stopRepo, tripRepo, cacheService, &config.Config{})

    // Test data
    req := &models.CreateStopRequest{
        TripID: "507f1f77bcf86cd799439011",
        Title:  "Test Stop",
    }
    userID := primitive.NewObjectID()

    // Mock expectations
    tripRepo.On("GetByID", mock.Anything, mock.Anything).Return(&models.Trip{
        OwnerID: userID,
    }, nil)
    stopRepo.On("Create", mock.Anything, mock.Anything).Return(nil)
    cacheService.On("Delete", mock.Anything, mock.Anything).Return(nil)

    // Execute
    stop, err := service.CreateStop(context.Background(), req, userID)

    // Assert
    assert.NoError(t, err)
    assert.NotNil(t, stop)
    assert.Equal(t, "Test Stop", stop.Title)
}
```

Run tests:

```bash
# Run all tests
go test ./...

# Run tests with coverage
go test -v -cover ./...

# Run specific package tests
go test ./internal/service/...
```

#### Integration Tests

Create integration tests for API endpoints:

```go
// test/integration/stop_test.go
package integration

import (
    "bytes"
    "encoding/json"
    "net/http"
    "testing"
    "github.com/stretchr/testify/assert"
)

func TestCreateStop(t *testing.T) {
    // Setup test server
    app := setupTestApp()

    // Create test user and trip
    user := createTestUser(t)
    trip := createTestTrip(t, user.ID)

    // Test data
    stopData := map[string]interface{}{
        "trip_id": trip.ID.Hex(),
        "title":   "Test Stop",
        "order":   1,
    }

    body, _ := json.Marshal(stopData)
    req := bytes.NewReader(body)

    // Make request
    resp, err := app.Test(httptest.NewRequest("POST", "/api/v1/stops", req))
    assert.NoError(t, err)
    assert.Equal(t, http.StatusCreated, resp.StatusCode)
}
```

### Database Operations

#### Indexes

Add indexes in `migrations/indexes.go`:

```go
// Create stop indexes
stopsCollection := db.Collection("stops")

tripStopIndex := mongo.IndexModel{
    Keys: bson.D{
        {Key: "trip_id", Value: 1},
        {Key: "order", Value: 1},
    },
}
_, err = stopsCollection.Indexes().CreateOne(ctx, tripStopIndex)
```

#### Aggregation Pipelines

For complex queries, use aggregation:

```go
// Get trips with stop counts
pipeline := []bson.M{
    {
        "$lookup": bson.M{
            "from":         "stops",
            "localField":   "_id",
            "foreignField": "trip_id",
            "as":           "stops",
        },
    },
    {
        "$addFields": bson.M{
            "stop_count": bson.M{"$size": "$stops"},
        },
    },
    {
        "$project": bson.M{
            "stops": 0, // Exclude full stops array
        },
    },
}
```

### Caching Strategy

#### Cache Keys

Use consistent naming patterns:

```go
const (
    CacheKeyUserProfile = "user:profile:%s"
    CacheKeyUserTrips   = "user:trips:%s:page:%d"
    CacheKeyTripStops   = "trip:stops:%s"
    CacheKeyPublicTrips = "public:trips:page:%d"
)
```

#### Cache Implementation

```go
func (s *StopService) GetTripStops(ctx context.Context, tripID primitive.ObjectID) ([]*models.Stop, error) {
    cacheKey := fmt.Sprintf(CacheKeyTripStops, tripID.Hex())

    // Try cache first
    var stops []*models.Stop
    if err := s.cacheService.Get(ctx, cacheKey, &stops); err == nil {
        return stops, nil
    }

    // Fetch from database
    stops, err := s.stopRepo.GetByTripID(ctx, tripID)
    if err != nil {
        return nil, err
    }

    // Cache for 15 minutes
    s.cacheService.Set(ctx, cacheKey, stops, 15*60)

    return stops, nil
}
```

### Error Handling

#### Custom Errors

Create domain-specific errors:

```go
// internal/errors/errors.go
package errors

import "errors"

var (
    ErrUserNotFound     = errors.New("user not found")
    ErrTripNotFound     = errors.New("trip not found")
    ErrUnauthorized     = errors.New("unauthorized access")
    ErrInvalidInput     = errors.New("invalid input data")
    ErrDuplicateEmail   = errors.New("email already exists")
)
```

#### Error Handling in Handlers

```go
func (h *TripHandler) GetTrip(c *fiber.Ctx) error {
    id := c.Params("id")
    tripID, err := primitive.ObjectIDFromHex(id)
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
            Success: false,
            Error:   "Invalid trip ID format",
        })
    }

    trip, err := h.tripService.GetTrip(ctx, tripID, userID)
    if err != nil {
        switch err {
        case errors.ErrTripNotFound:
            return c.Status(fiber.StatusNotFound).JSON(models.APIResponse{
                Success: false,
                Error:   "Trip not found",
            })
        case errors.ErrUnauthorized:
            return c.Status(fiber.StatusForbidden).JSON(models.APIResponse{
                Success: false,
                Error:   "Access denied",
            })
        default:
            return c.Status(fiber.StatusInternalServerError).JSON(models.APIResponse{
                Success: false,
                Error:   "Internal server error",
            })
        }
    }

    return c.JSON(models.APIResponse{
        Success: true,
        Data:    trip,
    })
}
```

### Security Best Practices

#### Input Validation

Always validate input data:

```go
import "github.com/go-playground/validator/v10"

var validate = validator.New()

func (h *TripHandler) CreateTrip(c *fiber.Ctx) error {
    var req models.CreateTripRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
            Success: false,
            Error:   "Invalid request body",
        })
    }

    // Validate struct
    if err := validate.Struct(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
            Success: false,
            Error:   "Validation failed: " + err.Error(),
        })
    }

    // Additional business logic validation
    if req.StartDate.After(req.EndDate) {
        return c.Status(fiber.StatusBadRequest).JSON(models.APIResponse{
            Success: false,
            Error:   "Start date must be before end date",
        })
    }

    // Continue with creation...
}
```

#### Authorization

Implement proper authorization checks:

```go
func (s *TripService) UpdateTrip(ctx context.Context, tripID, userID primitive.ObjectID, req *models.UpdateTripRequest) (*models.Trip, error) {
    // Check ownership
    trip, err := s.tripRepo.GetByID(ctx, tripID)
    if err != nil {
        return nil, err
    }

    if trip.OwnerID != userID {
        return nil, errors.ErrUnauthorized
    }

    // Continue with update...
}
```

## Deployment

### Production Build

```bash
# Build for production
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# Build Docker image
docker build -t globetrotter-api:latest .
```

### Environment Variables

Set production environment variables:

```bash
# Required
export JWT_SECRET="your-production-secret-key"
export MONGO_URI="mongodb://prod-mongo:27017"
export REDIS_ADDR="prod-redis:6379"

# Optional
export ENVIRONMENT="production"
export PORT="8080"
export ALLOWED_ORIGINS="https://yourdomain.com"
```

### Health Monitoring

The API provides health check endpoints:

```bash
# Basic health check
curl http://localhost:8080/health

# Response
{
  "status": "ok",
  "environment": "production"
}
```

## Performance Optimization

### Database Query Optimization

1. **Use appropriate indexes**
2. **Limit returned fields**
3. **Implement pagination**
4. **Use aggregation pipelines for complex queries**

### Caching Strategy

1. **Cache expensive operations**
2. **Use appropriate TTL values**
3. **Implement cache invalidation**
4. **Use Redis for session storage**

### Connection Pooling

Configure database connection pools:

```go
// MongoDB connection options
clientOptions := options.Client().
    ApplyURI(config.MongoURI).
    SetMaxPoolSize(100).
    SetMinPoolSize(10)
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**

   - Check MongoDB/Redis service status
   - Verify connection strings
   - Check network connectivity

2. **JWT Token Issues**

   - Verify JWT_SECRET is set
   - Check token expiry times
   - Validate token format

3. **Rate Limiting Triggered**
   - Check Redis connection
   - Review rate limit configuration
   - Monitor user request patterns

### Debugging

Enable debug logging:

```bash
export ENVIRONMENT=development
```

Use logging in code:

```go
import "log"

log.Printf("Processing request for user %s", userID.Hex())
```

## Contributing

1. **Follow the established architecture patterns**
2. **Write comprehensive tests**
3. **Update documentation**
4. **Follow Go conventions**
5. **Add proper error handling**

### Code Review Checklist

- [ ] Proper error handling
- [ ] Input validation
- [ ] Authorization checks
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Database migrations if needed
- [ ] Performance considerations

For more information, see the main README.md and API documentation.
