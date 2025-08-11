# GlobeTrotter API Documentation

## Overview

The GlobeTrotter API is a RESTful backend service for travel planning and trip management. It provides secure user authentication, trip creation and sharing, and comprehensive travel planning features.

**Base URL:** `http://localhost:8080/api/v1`

**API Version:** v1.0.0

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Token Types

- **Access Token**: Short-lived (15 minutes), used for API requests

## Response Format

### Standard Response Structure

All API endpoints return responses in a consistent format:

```json
{
  "success": true|false,
  "message": "Optional message",
  "data": { ... },
  "error": "Error message (only on failure)"
}
```

### Paginated Responses

Endpoints that return lists use pagination:

```json
{
  "success": true,
  "data": {
    "page": 1,
    "limit": 20,
    "total_items": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false,
    "data": [ ... ]
  }
}
```

## Endpoints

### Authentication

#### POST /auth/signup

Register a new user account.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Validation Rules:**

- `name`: Required, 2-100 characters
- `email`: Required, valid email format
- `password`: Required, minimum 8 characters

**Response (201 Created):**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar_path": "",
      "preferences": {
        "language": "en",
        "currency": "USD",
        "theme": "light"
      },
      "created_at": "2025-08-11T12:00:00Z",
      "updated_at": "2025-08-11T12:00:00Z"
    }
  }
}
```

**Error Responses:**

- `400 Bad Request`: Invalid request data
- `409 Conflict`: Email already exists
- `500 Internal Server Error`: Server error

---

#### POST /auth/login

Authenticate an existing user.

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar_path": "/uploads/profile_pics/avatar_123.jpg",
      "preferences": {
        "language": "en",
        "currency": "USD",
        "theme": "light"
      },
      "created_at": "2025-08-11T12:00:00Z",
      "updated_at": "2025-08-11T12:00:00Z"
    }
  }
}
```

**Error Responses:**

- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Server error

---

### User Management

All user endpoints require authentication.

#### GET /users/me

Get current user profile.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar_path": "/uploads/profile_pics/avatar_123.jpg",
    "preferences": {
      "language": "en",
      "currency": "USD",
      "theme": "light"
    },
    "created_at": "2025-08-11T12:00:00Z",
    "updated_at": "2025-08-11T12:00:00Z"
  }
}
```

---

#### PUT /users/me

Update current user profile.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "name": "John Smith",
  "preferences": {
    "language": "es",
    "currency": "EUR",
    "theme": "dark"
  }
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Smith",
    "email": "john@example.com",
    "avatar_path": "/uploads/profile_pics/avatar_123.jpg",
    "preferences": {
      "language": "es",
      "currency": "EUR",
      "theme": "dark"
    },
    "created_at": "2025-08-11T12:00:00Z",
    "updated_at": "2025-08-11T12:05:00Z"
  }
}
```

---

#### POST /users/avatar

Upload user avatar image.

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**

- `avatar`: Image file (JPEG, PNG, GIF)
- Maximum file size: 5MB

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "avatar_path": "/uploads/profile_pics/avatar_507f1f77bcf86cd799439011.jpg"
  }
}
```

---

#### DELETE /users/me

Delete current user account.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

### Trip Management

#### GET /trips/public

Get public trips (no authentication required).

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Sort order (newest, oldest, popular)

**Example Request:**

```
GET /api/v1/trips/public?page=1&limit=20&sort=newest
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "page": 1,
    "limit": 20,
    "total_items": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false,
    "data": [
      {
        "id": "507f1f77bcf86cd799439012",
        "title": "European Adventure",
        "description": "10-day trip through Europe",
        "owner_id": "507f1f77bcf86cd799439011",
        "privacy": "public",
        "start_date": "2025-09-01T00:00:00Z",
        "end_date": "2025-09-10T00:00:00Z",
        "created_at": "2025-08-11T12:00:00Z",
        "updated_at": "2025-08-11T12:00:00Z"
      }
    ]
  }
}
```

---

#### GET /trips/share/:shareToken

Get shared trip by share token (no authentication required).

**Path Parameters:**

- `shareToken`: Unique share token

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "title": "European Adventure",
    "description": "10-day trip through Europe",
    "owner_id": "507f1f77bcf86cd799439011",
    "privacy": "shared",
    "start_date": "2025-09-01T00:00:00Z",
    "end_date": "2025-09-10T00:00:00Z",
    "created_at": "2025-08-11T12:00:00Z",
    "updated_at": "2025-08-11T12:00:00Z"
  }
}
```

---

#### POST /trips

Create a new trip (authentication required).

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "title": "Summer Vacation",
  "description": "Beach holiday in Thailand",
  "privacy": "private",
  "start_date": "2025-07-01T00:00:00Z",
  "end_date": "2025-07-14T00:00:00Z"
}
```

**Validation Rules:**

- `title`: Required, 1-200 characters
- `description`: Optional, max 1000 characters
- `privacy`: Required, one of: "private", "public"
- `start_date`: Required, valid ISO date
- `end_date`: Required, valid ISO date, must be after start_date

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Trip created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439013",
    "title": "Summer Vacation",
    "description": "Beach holiday in Thailand",
    "owner_id": "507f1f77bcf86cd799439011",
    "privacy": "private",
    "start_date": "2025-07-01T00:00:00Z",
    "end_date": "2025-07-14T00:00:00Z",
    "created_at": "2025-08-11T12:10:00Z",
    "updated_at": "2025-08-11T12:10:00Z"
  }
}
```

---

#### GET /trips

Get current user's trips (authentication required).

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "page": 1,
    "limit": 20,
    "total_items": 5,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false,
    "data": [
      {
        "id": "507f1f77bcf86cd799439013",
        "title": "Summer Vacation",
        "description": "Beach holiday in Thailand",
        "owner_id": "507f1f77bcf86cd799439011",
        "privacy": "private",
        "start_date": "2025-07-01T00:00:00Z",
        "end_date": "2025-07-14T00:00:00Z",
        "created_at": "2025-08-11T12:10:00Z",
        "updated_at": "2025-08-11T12:10:00Z"
      }
    ]
  }
}
```

---

#### GET /trips/:id

Get specific trip by ID (authentication required).

**Headers:**

```
Authorization: Bearer <access_token>
```

**Path Parameters:**

- `id`: Trip ID (MongoDB ObjectID)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439013",
    "title": "Summer Vacation",
    "description": "Beach holiday in Thailand",
    "owner_id": "507f1f77bcf86cd799439011",
    "privacy": "private",
    "start_date": "2025-07-01T00:00:00Z",
    "end_date": "2025-07-14T00:00:00Z",
    "created_at": "2025-08-11T12:10:00Z",
    "updated_at": "2025-08-11T12:10:00Z"
  }
}
```

**Error Responses:**

- `404 Not Found`: Trip not found or access denied

---

#### PUT /trips/:id

Update specific trip (authentication required).

**Headers:**

```
Authorization: Bearer <access_token>
```

**Path Parameters:**

- `id`: Trip ID (MongoDB ObjectID)

**Request Body:**

```json
{
  "title": "Updated Summer Vacation",
  "description": "Extended beach holiday in Thailand and Cambodia",
  "privacy": "public",
  "start_date": "2025-07-01T00:00:00Z",
  "end_date": "2025-07-21T00:00:00Z"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Trip updated successfully",
  "data": {
    "id": "507f1f77bcf86cd799439013",
    "title": "Updated Summer Vacation",
    "description": "Extended beach holiday in Thailand and Cambodia",
    "owner_id": "507f1f77bcf86cd799439011",
    "privacy": "public",
    "start_date": "2025-07-01T00:00:00Z",
    "end_date": "2025-07-21T00:00:00Z",
    "created_at": "2025-08-11T12:10:00Z",
    "updated_at": "2025-08-11T12:15:00Z"
  }
}
```

---

#### DELETE /trips/:id

Delete specific trip (authentication required).

**Headers:**

```
Authorization: Bearer <access_token>
```

**Path Parameters:**

- `id`: Trip ID (MongoDB ObjectID)

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Trip deleted successfully"
}
```

---

#### POST /trips/:id/share

Share a trip publicly (authentication required).

**Headers:**

```
Authorization: Bearer <access_token>
```

**Path Parameters:**

- `id`: Trip ID (MongoDB ObjectID)

**Request Body:**

```json
{
  "expires_in_hours": 168
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Trip shared successfully",
  "data": {
    "share_token": "abc123def456",
    "share_url": "http://localhost:8080/api/v1/trips/share/abc123def456",
    "expires_at": "2025-08-18T12:00:00Z"
  }
}
```

---

#### POST /trips/:id/duplicate

Duplicate a trip (authentication required).

**Headers:**

```
Authorization: Bearer <access_token>
```

**Path Parameters:**

- `id`: Trip ID (MongoDB ObjectID)

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Trip duplicated successfully",
  "data": {
    "id": "507f1f77bcf86cd799439014",
    "title": "Copy of Summer Vacation",
    "description": "Beach holiday in Thailand",
    "owner_id": "507f1f77bcf86cd799439011",
    "privacy": "private",
    "start_date": "2025-07-01T00:00:00Z",
    "end_date": "2025-07-14T00:00:00Z",
    "created_at": "2025-08-11T12:20:00Z",
    "updated_at": "2025-08-11T12:20:00Z"
  }
}
```

### Utility Endpoints

#### GET /health

Health check endpoint (no authentication required).

**Response (200 OK):**

```json
{
  "status": "ok",
  "environment": "development"
}
```

## Error Codes

The API uses standard HTTP status codes:

- `200 OK`: Success
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required or invalid
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General endpoints**: 100 requests per minute per user
- **Authentication endpoints**: 5 requests per minute per IP
- **File upload endpoints**: 10 requests per hour per user

When rate limit is exceeded, the API returns:

```json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later."
}
```

## File Uploads

### Avatar Upload Specifications

- **Supported formats**: JPEG, PNG, GIF
- **Maximum file size**: 5MB
- **Recommended dimensions**: 256x256 pixels
- **Storage location**: `/uploads/profile_pics/`

## Security

### HTTPS

All production deployments must use HTTPS to protect sensitive data in transit.

### CORS

The API supports Cross-Origin Resource Sharing (CORS) with configurable origins.

### Data Validation

All input data is validated both at the HTTP layer and business logic layer.

### Password Security

- Passwords are hashed using bcrypt with cost factor 12
- Minimum password length: 8 characters
- No password complexity requirements (encourage passphrases)

## Development

### Local Setup

1. Start the services:

```bash
docker-compose up -d
```

2. The API will be available at `http://localhost:8080`

### Testing

Use tools like Postman, curl, or Insomnia to test the API endpoints.

Example curl request:

```bash
# Register a new user
curl -X POST http://localhost:8080/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

## Support

For questions about the API, please refer to the main README.md file or contact the development team.
