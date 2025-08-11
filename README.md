# GlobeTrotter Backend API

A production-ready, horizontally scalable backend for the GlobeTrotter travel planning system built with Go, Fiber, MongoDB, and Redis.

## Features

### 🏗️ Architecture & Scalability

- **Clean Architecture**: Service-oriented folder structure with separation of concerns
- **Horizontal Scaling**: Stateless API layer ready for load balancer deployment
- **High Performance**: MongoDB indexes for optimized queries
- **Caching Strategy**: Redis caching for public content and admin stats
- **Distributed Locks**: Redis-based locking for critical operations
- **Pagination**: All list endpoints support pagination to handle large datasets

### 🔐 Authentication & Authorization

- JWT-based authentication with role-based access control
- User roles: `user` and `admin`
- Secure password hashing with bcrypt
- Protected routes with middleware

### 📊 Core Functionality

- **User Management**: Signup, login, profile management
- **Trip Planning**: CRUD operations for trips with public sharing
- **Stops Management**: Geographical stops with location indexing
- **Activities**: Detailed activity planning within stops
- **Public Sharing**: Share trips publicly with unique tokens
- **Admin Dashboard**: Platform statistics and management

### 🚀 Production Ready

- Environment-based configuration
- Graceful shutdown handling
- Comprehensive error handling
- Docker containerization
- Health check endpoints
- Logging and monitoring ready

## Tech Stack

- **Language**: Go 1.21+
- **Web Framework**: Fiber v2
- **Database**: MongoDB with official driver
- **Caching**: Redis
- **Authentication**: JWT tokens
- **Environment**: Docker & Docker Compose

## Project Structure

```
globetrotter/
├── cmd/
│   └── server/
│       └── main.go              # Application entry point
├── config/
│   ├── config.go                # Configuration management
│   └── database.go              # Database connections & indexes
├── controllers/
│   ├── user_controller.go       # User HTTP handlers
│   ├── trip_controller.go       # Trip HTTP handlers
│   ├── stop_controller.go       # Stop HTTP handlers
│   ├── activity_controller.go   # Activity HTTP handlers
│   └── admin_controller.go      # Admin HTTP handlers
├── middlewares/
│   ├── auth.go                  # Authentication & authorization
│   └── common.go                # CORS, logging, validation
├── models/
│   ├── common.go                # Shared models & pagination
│   ├── user.go                  # User models & DTOs
│   ├── trip.go                  # Trip models & DTOs
│   ├── stop.go                  # Stop models & DTOs
│   └── activity.go              # Activity models & DTOs
├── repositories/
│   ├── user_repository.go       # User data access
│   ├── trip_repository.go       # Trip data access
│   ├── stop_repository.go       # Stop data access
│   └── activity_repository.go   # Activity data access
├── services/
│   ├── user_service.go          # User business logic
│   ├── trip_service.go          # Trip business logic
│   ├── stop_service.go          # Stop business logic
│   ├── activity_service.go      # Activity business logic
│   └── admin_service.go         # Admin business logic
├── utils/
│   ├── auth.go                  # JWT & password utilities
│   └── cache.go                 # Redis cache utilities
├── .env.example                 # Environment variables template
├── Dockerfile                   # Docker configuration
├── docker-compose.yml          # Development environment
└── go.mod                       # Go module dependencies
```

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd globetrotter
```

### 2. Environment Configuration

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Using Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### 4. Manual Setup

```bash
# Install dependencies
go mod tidy

# Start MongoDB and Redis locally
# Then start the API
go run cmd/server/main.go
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - User login

### Users

- `GET /api/v1/users/me` - Get user profile
- `PUT /api/v1/users/me` - Update user profile
- `DELETE /api/v1/users/me` - Delete user account

### Trips

- `GET /api/v1/trips/public` - List public trips (paginated)
- `GET /api/v1/trips/public/:shareToken` - Get public trip by token
- `POST /api/v1/trips` - Create trip (authenticated)
- `GET /api/v1/trips` - Get user trips (authenticated)
- `GET /api/v1/trips/:id` - Get trip by ID
- `PUT /api/v1/trips/:id` - Update trip
- `DELETE /api/v1/trips/:id` - Delete trip

### Stops

- `POST /api/v1/stops/trips/:tripId` - Create stop
- `GET /api/v1/stops/trips/:tripId` - Get trip stops
- `GET /api/v1/stops/:id` - Get stop by ID
- `PUT /api/v1/stops/:id` - Update stop
- `DELETE /api/v1/stops/:id` - Delete stop
- `GET /api/v1/stops/nearby` - Find nearby stops

### Activities

- `POST /api/v1/activities/stops/:stopId` - Create activity
- `GET /api/v1/activities/stops/:stopId` - Get stop activities
- `GET /api/v1/activities/:id` - Get activity by ID
- `PUT /api/v1/activities/:id` - Update activity
- `DELETE /api/v1/activities/:id` - Delete activity

### Admin (Admin Role Required)

- `GET /api/v1/admin/users` - List all users
- `GET /api/v1/admin/trips` - List all trips
- `GET /api/v1/admin/stats` - Platform statistics

### Health Check

- `GET /health` - Service health status

## Environment Variables

```env
# Server
PORT=8080
ENVIRONMENT=development

# MongoDB
MONGO_URI=mongodb://localhost:27017
MONGO_DATABASE=globetrotter

# Redis
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY_HOURS=72

# CORS
ALLOWED_ORIGINS=*
```

## Database Indexes

The application automatically creates optimized indexes:

### Users Collection

- Unique index on `email`

### Trips Collection

- Compound index on `is_public` + `created_at`
- Compound index on `user_id` + `created_at`
- Index on `share_token`

### Stops Collection

- Compound index on `trip_id` + `position`
- 2dsphere index on `location` for geo queries

### Activities Collection

- Compound index on `stop_id` + `day_offset` + `start_time`

## Caching Strategy

### Redis Cache Keys & TTL

- **Public Trips List**: 5 minutes
- **Public Trip Details**: 30 minutes
- **User Trips**: 2 minutes
- **Admin Stats**: 10 minutes
- **Trip Stops**: 15 minutes
- **Stop Activities**: 10 minutes

### Cache Invalidation

- Automatic cache invalidation on data updates
- Distributed locks prevent race conditions

## Production Deployment

### Docker Production Build

```bash
# Build production image
docker build -t globetrotter-api:latest .

# Run with production environment
docker run -d \
  --name globetrotter-api \
  -p 8080:8080 \
  -e ENVIRONMENT=production \
  -e MONGO_URI=mongodb://your-mongo-cluster \
  -e REDIS_ADDR=your-redis-cluster \
  -e JWT_SECRET=your-production-secret \
  globetrotter-api:latest
```

### Cloud Deployment Considerations

- Use MongoDB Atlas for managed database
- Use Redis Cloud for managed caching
- Configure proper JWT secrets
- Set up load balancers for horizontal scaling
- Enable SSL/TLS termination
- Configure monitoring and logging

### Scaling

- The API is stateless and can be horizontally scaled
- Use load balancers to distribute traffic
- MongoDB supports sharding for large datasets
- Redis can be clustered for high availability

## Development

### Running Tests

```bash
go test ./...
```

### Hot Reload (Development)

```bash
# Install air for hot reload
go install github.com/cosmtrek/air@latest

# Run with hot reload
air
```

### Database Management

- **MongoDB Express**: http://localhost:8081 (admin/admin123)
- **Redis Commander**: http://localhost:8082

## API Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": {
    "page": 1,
    "limit": 20,
    "total_items": 100,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false,
    "data": [ ... ]
  }
}
```

## Security Features

- **Password Hashing**: bcrypt with salt
- **JWT Security**: Configurable expiry and secret
- **Input Validation**: Request body validation
- **Authorization**: Role-based access control
- **CORS**: Configurable allowed origins
- **Error Handling**: No sensitive data leakage

## Monitoring & Observability

- Health check endpoint for load balancer monitoring
- Structured logging for request tracking
- Slow query detection and logging
- Redis connection monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License.
