# GlobeTrotter Backend API

A production-ready, horizontally scalable backend for the GlobeTrotter travel planning system built with Go, Fiber, MongoDB, and Redis.

## Features

### 🏗️ Architecture & Scalability

- **Clean Architecture**: Internal package structure following Go best practices
- **Horizontal Scaling**: Stateless API layer ready for load balancer deployment
- **High Performance**: MongoDB indexes for optimized queries and aggregation pipelines
- **Caching Strategy**: Redis caching with TTL management and distributed locking
- **Rate Limiting**: Redis-based rate limiting for API protection
- **Pagination**: All list endpoints support pagination to handle large datasets
- **File Upload**: Secure avatar upload with MIME validation

### 🔐 Authentication & Authorization

- JWT-based authentication with access tokens (15min)
- User roles: `user` and `admin`
- Secure password hashing with bcrypt
- Protected routes with middleware

### 📊 Core Functionality

- **User Management**: Signup, login, profile management, avatar upload
- **Trip Planning**: CRUD operations for trips with sharing and duplication
- **Stops Management**: Geographical stops with location-based queries
- **Activities**: Detailed activity planning within stops
- **Public Sharing**: Share trips publicly with expiring tokens
- **Trip Duplication**: Copy trips from other users or public shares
- **Admin Dashboard**: Platform statistics and user management

### 🚀 Production Ready

- Environment-based configuration with .env support
- Graceful shutdown handling with proper resource cleanup
- Comprehensive error handling and logging
- Docker containerization with multi-stage builds
- Health check endpoints for monitoring
- MongoDB indexes auto-creation on startup
- CORS and security middleware

## Tech Stack

- **Language**: Go 1.23+
- **Web Framework**: Fiber v2
- **Database**: MongoDB with official driver
- **Caching**: Redis with connection pooling
- **Authentication**: JWT tokens with HS256
- **Environment**: Docker & Docker Compose
- **Architecture**: Clean Architecture with internal packages

## Project Structure

```
├── cmd/
│   └── server/
│       └── main.go              # Application entry point
├── internal/                    # Private application code
│   ├── api/
│   │   └── handlers.go          # HTTP request handlers
│   ├── auth/
│   │   └── auth.go              # JWT authentication service
│   ├── cache/
│   │   └── cache.go             # Redis caching service
│   ├── config/
│   │   ├── config.go            # Configuration management
│   │   └── database.go          # Database connections
│   ├── middleware/
│   │   └── middleware.go        # HTTP middlewares
│   ├── models/
│   │   └── models.go            # Data models and DTOs
│   ├── service/
│   │   ├── user_service.go      # User business logic
│   │   └── trip_service.go      # Trip business logic
│   └── store/                   # Data access layer
│       ├── user_repository.go
│       ├── trip_repository.go
│       ├── stop_repository.go
│       ├── city_activity_repository.go
│       ├── itinerary_shared_repository.go

├── migrations/
│   └── indexes.go               # Database index creation
├── uploads/
│   └── profile_pics/            # User avatar storage
├── docker-compose.yml           # Development environment
├── Dockerfile                   # Production container
├── go.mod                       # Go module dependencies
└── README.md                    # This file
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - User login

### Users (Authenticated)

- `GET /api/v1/users/me` - Get user profile
- `PUT /api/v1/users/me` - Update user profile
- `DELETE /api/v1/users/me` - Delete user account
- `POST /api/v1/users/avatar` - Upload user avatar

### Trips

- `GET /api/v1/trips/public` - Get public trips (paginated)
- `GET /api/v1/trips/share/:token` - Get shared trip by token
- `POST /api/v1/trips` - Create new trip (authenticated)
- `GET /api/v1/trips` - Get user's trips (authenticated)
- `GET /api/v1/trips/:id` - Get trip by ID (authenticated)
- `PUT /api/v1/trips/:id` - Update trip (authenticated)
- `DELETE /api/v1/trips/:id` - Delete trip (authenticated)
- `POST /api/v1/trips/:id/share` - Share trip publicly (authenticated)
- `POST /api/v1/trips/:id/duplicate` - Duplicate trip (authenticated)

### Health Check

- `GET /health` - Service health status

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Go 1.23+ (for local development)

### Using Docker Compose (Recommended)

1. Clone the repository:

```bash
git clone <your-repo-url>
cd globe-trotter
```

2. Start all services:

```bash
docker-compose up -d
```

3. The API will be available at `http://localhost:8080`

Additional services:

- MongoDB Express: `http://localhost:8081` (admin/admin123)
- Redis Commander: `http://localhost:8082`

### Local Development

1. Install dependencies:

```bash
go mod download
```

2. Set up environment variables (create `.env` file):

```env
PORT=8080
ENVIRONMENT=development
MONGO_URI=mongodb://localhost:27017
MONGO_DATABASE=globetrotter
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=
REDIS_DB=0
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRY_MINUTES=15

ALLOWED_ORIGINS=*
UPLOAD_PATH=./uploads
MAX_UPLOAD_SIZE=5242880
```

3. Start MongoDB and Redis locally

4. Run the application:

```bash
go run cmd/server/main.go
```

## Environment Variables

| Variable                    | Description                          | Default                     |
| --------------------------- | ------------------------------------ | --------------------------- |
| `PORT`                      | Server port                          | `8080`                      |
| `ENVIRONMENT`               | Environment (development/production) | `development`               |
| `MONGO_URI`                 | MongoDB connection string            | `mongodb://localhost:27017` |
| `MONGO_DATABASE`            | MongoDB database name                | `globetrotter`              |
| `REDIS_ADDR`                | Redis server address                 | `localhost:6379`            |
| `REDIS_PASSWORD`            | Redis password                       | ``                          |
| `REDIS_DB`                  | Redis database number                | `0`                         |
| `JWT_SECRET`                | JWT signing secret                   | **Required**                |
| `JWT_ACCESS_EXPIRY_MINUTES` | Access token expiry in minutes       | `15`                        |

| `ALLOWED_ORIGINS` | CORS allowed origins | `*` |
| `UPLOAD_PATH` | File upload directory | `./uploads` |
| `MAX_UPLOAD_SIZE` | Max file upload size in bytes | `5242880` |

## Database Schema

### Users Collection

```javascript
{
  "_id": ObjectId,
  "name": String,
  "email": String (unique),
  "password": String (hashed),
  "role": String ("user" | "admin"),
  "avatar": String (optional),
  "created_at": Date,
  "updated_at": Date
}
```

### Trips Collection

```javascript
{
  "_id": ObjectId,
  "title": String,
  "description": String,
  "owner_id": ObjectId,
  "privacy": String ("private" | "public"),
  "start_date": Date,
  "end_date": Date,
  "created_at": Date,
  "updated_at": Date
}
```

### Additional collections: `stops`, `cities`, `activities`, `itinerary_items`, `shared_trips`

## Caching Strategy

- **User sessions**: 1 hour TTL
- **Public trips**: 30 minutes TTL
- **Trip details**: 15 minutes TTL
- **User profiles**: 1 hour TTL
- **Rate limiting**: Per-user counters with sliding window

## Performance Optimizations

### MongoDB Indexes

- Users: `email` (unique)
- Trips: `owner_id`, `privacy + created_at` (compound)
- Stops: `trip_id + order` (compound)
- Cities: `geo` (2dsphere), `name + country` (text), `popularity`
- Activities: `city_id + popularity` (compound), `type`, `title + description` (text)

### Redis Patterns

- Distributed locking for concurrent operations
- Rate limiting with sliding window
- Session management with automatic expiry
- Cache warming for frequently accessed data

## Testing

Run tests:

```bash
go test ./...
```

Run tests with coverage:

```bash
go test -v -cover ./...
```

## Deployment

### Docker Build

```bash
docker build -t globetrotter-api .
```

### Production Deployment

1. Set production environment variables
2. Use a process manager (PM2, systemd)
3. Set up load balancer (nginx, HAProxy)
4. Configure monitoring and logging
5. Set up database backups

## Security Features

- Bcrypt password hashing with cost 12
- JWT tokens with short expiry
- Rate limiting per user/IP
- CORS configuration
- File upload validation
- SQL injection prevention (NoSQL)
- XSS protection through proper JSON handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions and support, please open an issue in the GitHub repository.
