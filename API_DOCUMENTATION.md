# GlobeTrotter API Documentation

## Base URL

```
http://localhost:8080/api/v1
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

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

## Endpoints

### Health Check

#### GET /health

Check if the API is running.

**Response:**

```json
{
  "status": "ok",
  "environment": "development"
}
```

---

## Authentication Endpoints

### POST /auth/signup

Register a new user.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "64f8b1c2e8f1234567890abc",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user",
    "avatar_url": "",
    "bio": "",
    "preferences": {
      "language": "en",
      "currency": "USD"
    },
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "last_login_at": null
  }
}
```

### POST /auth/login

Authenticate a user and get JWT token.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64f8b1c2e8f1234567890abc",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "user",
      "avatar_url": "",
      "bio": "",
      "preferences": {
        "language": "en",
        "currency": "USD"
      },
      "is_active": true,
      "created_at": "2024-01-15T10:30:00Z",
      "last_login_at": "2024-01-15T11:00:00Z"
    }
  }
}
```

---

## User Endpoints

All user endpoints require authentication.

### GET /users/me

Get current user profile.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "64f8b1c2e8f1234567890abc",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user",
    "avatar_url": "https://example.com/avatar.jpg",
    "bio": "Travel enthusiast",
    "preferences": {
      "language": "en",
      "currency": "USD"
    },
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "last_login_at": "2024-01-15T11:00:00Z"
  }
}
```

### PUT /users/me

Update current user profile.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Request Body:**

```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "avatar_url": "https://example.com/new-avatar.jpg",
  "bio": "Adventure seeker and photographer",
  "preferences": {
    "language": "es",
    "currency": "EUR"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "64f8b1c2e8f1234567890abc",
    "email": "user@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "role": "user",
    "avatar_url": "https://example.com/new-avatar.jpg",
    "bio": "Adventure seeker and photographer",
    "preferences": {
      "language": "es",
      "currency": "EUR"
    },
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "last_login_at": "2024-01-15T11:00:00Z"
  }
}
```

### DELETE /users/me

Delete current user account (soft delete).

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "success": true,
  "message": "Profile deleted successfully"
}
```

---

## Trip Endpoints

### GET /trips/public

Get public trips (no authentication required).

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**

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
        "id": "64f8b1c2e8f1234567890def",
        "name": "European Adventure",
        "description": "A month-long journey through Europe",
        "start_date": "2024-06-01T00:00:00Z",
        "end_date": "2024-06-30T23:59:59Z",
        "cover_image": "https://example.com/trip-cover.jpg",
        "view_count": 127,
        "created_at": "2024-01-15T10:30:00Z",
        "stops_count": 8,
        "user": {
          "id": "64f8b1c2e8f1234567890abc",
          "first_name": "John",
          "last_name": "Doe"
        }
      }
    ]
  }
}
```

### GET /trips/public/{shareToken}

Get a public trip by share token (no authentication required).

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "64f8b1c2e8f1234567890def",
    "name": "European Adventure",
    "description": "A month-long journey through Europe",
    "start_date": "2024-06-01T00:00:00Z",
    "end_date": "2024-06-30T23:59:59Z",
    "cover_image": "https://example.com/trip-cover.jpg",
    "view_count": 128,
    "created_at": "2024-01-15T10:30:00Z",
    "stops_count": 8,
    "user": {
      "id": "64f8b1c2e8f1234567890abc",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

### POST /trips

Create a new trip (authentication required).

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Request Body:**

```json
{
  "name": "Summer Vacation 2024",
  "description": "A relaxing summer vacation in the Mediterranean",
  "start_date": "2024-07-15T00:00:00Z",
  "end_date": "2024-07-29T23:59:59Z",
  "is_public": true,
  "cover_image": "https://example.com/vacation-cover.jpg",
  "total_budget": 2500.0,
  "currency": "USD"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Trip created successfully",
  "data": {
    "id": "64f8b1c2e8f1234567890ghi",
    "user_id": "64f8b1c2e8f1234567890abc",
    "name": "Summer Vacation 2024",
    "description": "A relaxing summer vacation in the Mediterranean",
    "start_date": "2024-07-15T00:00:00Z",
    "end_date": "2024-07-29T23:59:59Z",
    "is_public": true,
    "cover_image": "https://example.com/vacation-cover.jpg",
    "total_budget": 2500.0,
    "currency": "USD",
    "share_token": "a1b2c3d4e5f6g7h8",
    "view_count": 0,
    "created_at": "2024-01-15T12:00:00Z",
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

### GET /trips

Get current user's trips (authentication required).

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**

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
        "id": "64f8b1c2e8f1234567890ghi",
        "user_id": "64f8b1c2e8f1234567890abc",
        "name": "Summer Vacation 2024",
        "description": "A relaxing summer vacation in the Mediterranean",
        "start_date": "2024-07-15T00:00:00Z",
        "end_date": "2024-07-29T23:59:59Z",
        "is_public": true,
        "cover_image": "https://example.com/vacation-cover.jpg",
        "total_budget": 2500.0,
        "currency": "USD",
        "share_token": "a1b2c3d4e5f6g7h8",
        "view_count": 0,
        "created_at": "2024-01-15T12:00:00Z",
        "updated_at": "2024-01-15T12:00:00Z",
        "stops_count": 3
      }
    ]
  }
}
```

### GET /trips/{id}

Get a trip by ID (authentication required).

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "64f8b1c2e8f1234567890ghi",
    "user_id": "64f8b1c2e8f1234567890abc",
    "name": "Summer Vacation 2024",
    "description": "A relaxing summer vacation in the Mediterranean",
    "start_date": "2024-07-15T00:00:00Z",
    "end_date": "2024-07-29T23:59:59Z",
    "is_public": true,
    "cover_image": "https://example.com/vacation-cover.jpg",
    "total_budget": 2500.0,
    "currency": "USD",
    "share_token": "a1b2c3d4e5f6g7h8",
    "view_count": 0,
    "created_at": "2024-01-15T12:00:00Z",
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

### PUT /trips/{id}

Update a trip (authentication required, owner only).

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Request Body:**

```json
{
  "name": "Updated Summer Vacation 2024",
  "description": "An amazing summer vacation in the Mediterranean",
  "total_budget": 3000.0,
  "is_public": false
}
```

**Response:**

```json
{
  "success": true,
  "message": "Trip updated successfully",
  "data": {
    "id": "64f8b1c2e8f1234567890ghi",
    "user_id": "64f8b1c2e8f1234567890abc",
    "name": "Updated Summer Vacation 2024",
    "description": "An amazing summer vacation in the Mediterranean",
    "start_date": "2024-07-15T00:00:00Z",
    "end_date": "2024-07-29T23:59:59Z",
    "is_public": false,
    "cover_image": "https://example.com/vacation-cover.jpg",
    "total_budget": 3000.0,
    "currency": "USD",
    "share_token": "",
    "view_count": 0,
    "created_at": "2024-01-15T12:00:00Z",
    "updated_at": "2024-01-15T12:30:00Z"
  }
}
```

### DELETE /trips/{id}

Delete a trip (authentication required, owner only).

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "success": true,
  "message": "Trip deleted successfully"
}
```

---

## Stop Endpoints

All stop endpoints require authentication.

### POST /stops/trips/{tripId}

Create a new stop for a trip.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Request Body:**

```json
{
  "city": "Paris",
  "country": "France",
  "lat": 48.8566,
  "lng": 2.3522,
  "google_place_id": "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
  "arrival_date": "2024-07-16T14:00:00Z",
  "departure_date": "2024-07-19T10:00:00Z",
  "position": 1,
  "notes": "Visit the Eiffel Tower and Louvre Museum"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Stop created successfully",
  "data": {
    "id": "64f8b1c2e8f1234567890jkl",
    "trip_id": "64f8b1c2e8f1234567890ghi",
    "city": "Paris",
    "country": "France",
    "lat": 48.8566,
    "lng": 2.3522,
    "google_place_id": "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
    "arrival_date": "2024-07-16T14:00:00Z",
    "departure_date": "2024-07-19T10:00:00Z",
    "position": 1,
    "notes": "Visit the Eiffel Tower and Louvre Museum",
    "created_at": "2024-01-15T12:15:00Z",
    "updated_at": "2024-01-15T12:15:00Z"
  }
}
```

### GET /stops/trips/{tripId}

Get all stops for a trip.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "64f8b1c2e8f1234567890jkl",
      "trip_id": "64f8b1c2e8f1234567890ghi",
      "city": "Paris",
      "country": "France",
      "lat": 48.8566,
      "lng": 2.3522,
      "google_place_id": "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
      "arrival_date": "2024-07-16T14:00:00Z",
      "departure_date": "2024-07-19T10:00:00Z",
      "position": 1,
      "notes": "Visit the Eiffel Tower and Louvre Museum",
      "created_at": "2024-01-15T12:15:00Z",
      "updated_at": "2024-01-15T12:15:00Z",
      "activities_count": 4
    }
  ]
}
```

### GET /stops/{id}

Get a stop by ID.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "64f8b1c2e8f1234567890jkl",
    "trip_id": "64f8b1c2e8f1234567890ghi",
    "city": "Paris",
    "country": "France",
    "lat": 48.8566,
    "lng": 2.3522,
    "google_place_id": "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
    "arrival_date": "2024-07-16T14:00:00Z",
    "departure_date": "2024-07-19T10:00:00Z",
    "position": 1,
    "notes": "Visit the Eiffel Tower and Louvre Museum",
    "created_at": "2024-01-15T12:15:00Z",
    "updated_at": "2024-01-15T12:15:00Z",
    "activities_count": 4
  }
}
```

### PUT /stops/{id}

Update a stop.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Request Body:**

```json
{
  "city": "Paris",
  "country": "France",
  "notes": "Visit the Eiffel Tower, Louvre Museum, and take a Seine river cruise"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Stop updated successfully",
  "data": {
    "id": "64f8b1c2e8f1234567890jkl",
    "trip_id": "64f8b1c2e8f1234567890ghi",
    "city": "Paris",
    "country": "France",
    "lat": 48.8566,
    "lng": 2.3522,
    "google_place_id": "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
    "arrival_date": "2024-07-16T14:00:00Z",
    "departure_date": "2024-07-19T10:00:00Z",
    "position": 1,
    "notes": "Visit the Eiffel Tower, Louvre Museum, and take a Seine river cruise",
    "created_at": "2024-01-15T12:15:00Z",
    "updated_at": "2024-01-15T12:45:00Z",
    "activities_count": 4
  }
}
```

### DELETE /stops/{id}

Delete a stop.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "success": true,
  "message": "Stop deleted successfully"
}
```

### GET /stops/nearby

Find nearby stops (public stops only).

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**

- `lat` (required): Latitude
- `lng` (required): Longitude
- `maxDistance` (optional): Maximum distance in meters (default: 10000)

**Example:**

```
GET /stops/nearby?lat=48.8566&lng=2.3522&maxDistance=5000
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "64f8b1c2e8f1234567890mno",
      "trip_id": "64f8b1c2e8f1234567890pqr",
      "city": "Paris",
      "country": "France",
      "lat": 48.8584,
      "lng": 2.2945,
      "google_place_id": "ChIJLU7jZClu5kcR4PcOOO6p3I0",
      "arrival_date": "2024-08-01T12:00:00Z",
      "departure_date": "2024-08-04T10:00:00Z",
      "position": 2,
      "notes": "Explore the Champs-Élysées",
      "created_at": "2024-01-15T13:00:00Z",
      "updated_at": "2024-01-15T13:00:00Z"
    }
  ]
}
```

---

## Activity Endpoints

All activity endpoints require authentication.

### POST /activities/stops/{stopId}

Create a new activity for a stop.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Request Body:**

```json
{
  "title": "Visit Eiffel Tower",
  "description": "Take photos and enjoy the view from the top",
  "cost": 25.9,
  "currency": "EUR",
  "day_offset": 0,
  "start_time": "14:00",
  "end_time": "16:30",
  "category": "sightseeing",
  "notes": "Book tickets in advance to avoid queues",
  "booking_url": "https://www.toureiffel.paris/en"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Activity created successfully",
  "data": {
    "id": "64f8b1c2e8f1234567890stu",
    "stop_id": "64f8b1c2e8f1234567890jkl",
    "title": "Visit Eiffel Tower",
    "description": "Take photos and enjoy the view from the top",
    "cost": 25.9,
    "currency": "EUR",
    "day_offset": 0,
    "start_time": "14:00",
    "end_time": "16:30",
    "category": "sightseeing",
    "notes": "Book tickets in advance to avoid queues",
    "booking_url": "https://www.toureiffel.paris/en",
    "created_at": "2024-01-15T12:20:00Z",
    "updated_at": "2024-01-15T12:20:00Z"
  }
}
```

### GET /activities/stops/{stopId}

Get all activities for a stop.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "64f8b1c2e8f1234567890stu",
      "stop_id": "64f8b1c2e8f1234567890jkl",
      "title": "Visit Eiffel Tower",
      "description": "Take photos and enjoy the view from the top",
      "cost": 25.9,
      "currency": "EUR",
      "day_offset": 0,
      "start_time": "14:00",
      "end_time": "16:30",
      "category": "sightseeing",
      "notes": "Book tickets in advance to avoid queues",
      "booking_url": "https://www.toureiffel.paris/en",
      "created_at": "2024-01-15T12:20:00Z",
      "updated_at": "2024-01-15T12:20:00Z"
    }
  ]
}
```

### GET /activities/{id}

Get an activity by ID.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "64f8b1c2e8f1234567890stu",
    "stop_id": "64f8b1c2e8f1234567890jkl",
    "title": "Visit Eiffel Tower",
    "description": "Take photos and enjoy the view from the top",
    "cost": 25.9,
    "currency": "EUR",
    "day_offset": 0,
    "start_time": "14:00",
    "end_time": "16:30",
    "category": "sightseeing",
    "notes": "Book tickets in advance to avoid queues",
    "booking_url": "https://www.toureiffel.paris/en",
    "created_at": "2024-01-15T12:20:00Z",
    "updated_at": "2024-01-15T12:20:00Z"
  }
}
```

### PUT /activities/{id}

Update an activity.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Request Body:**

```json
{
  "title": "Visit Eiffel Tower with lunch",
  "description": "Take photos, enjoy the view, and have lunch at the restaurant",
  "cost": 75.5,
  "end_time": "18:00"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Activity updated successfully",
  "data": {
    "id": "64f8b1c2e8f1234567890stu",
    "stop_id": "64f8b1c2e8f1234567890jkl",
    "title": "Visit Eiffel Tower with lunch",
    "description": "Take photos, enjoy the view, and have lunch at the restaurant",
    "cost": 75.5,
    "currency": "EUR",
    "day_offset": 0,
    "start_time": "14:00",
    "end_time": "18:00",
    "category": "sightseeing",
    "notes": "Book tickets in advance to avoid queues",
    "booking_url": "https://www.toureiffel.paris/en",
    "created_at": "2024-01-15T12:20:00Z",
    "updated_at": "2024-01-15T13:00:00Z"
  }
}
```

### DELETE /activities/{id}

Delete an activity.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "success": true,
  "message": "Activity deleted successfully"
}
```

---

## Admin Endpoints

All admin endpoints require authentication and admin role.

### GET /admin/users

Get all users (admin only).

**Headers:**

```
Authorization: Bearer <admin-jwt-token>
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**

```json
{
  "success": true,
  "data": {
    "page": 1,
    "limit": 20,
    "total_items": 1250,
    "total_pages": 63,
    "has_next": true,
    "has_prev": false,
    "data": [
      {
        "id": "64f8b1c2e8f1234567890abc",
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "role": "user",
        "avatar_url": "",
        "bio": "",
        "preferences": {
          "language": "en",
          "currency": "USD"
        },
        "is_active": true,
        "created_at": "2024-01-15T10:30:00Z",
        "last_login_at": "2024-01-15T11:00:00Z"
      }
    ]
  }
}
```

### GET /admin/trips

Get all trips (admin only).

**Headers:**

```
Authorization: Bearer <admin-jwt-token>
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**

```json
{
  "success": true,
  "data": {
    "page": 1,
    "limit": 20,
    "total_items": 5240,
    "total_pages": 262,
    "has_next": true,
    "has_prev": false,
    "data": [
      {
        "id": "64f8b1c2e8f1234567890ghi",
        "user_id": "64f8b1c2e8f1234567890abc",
        "name": "Summer Vacation 2024",
        "description": "A relaxing summer vacation in the Mediterranean",
        "start_date": "2024-07-15T00:00:00Z",
        "end_date": "2024-07-29T23:59:59Z",
        "is_public": true,
        "cover_image": "https://example.com/vacation-cover.jpg",
        "total_budget": 2500.0,
        "currency": "USD",
        "share_token": "a1b2c3d4e5f6g7h8",
        "view_count": 0,
        "created_at": "2024-01-15T12:00:00Z",
        "updated_at": "2024-01-15T12:00:00Z"
      }
    ]
  }
}
```

### GET /admin/stats

Get platform statistics (admin only).

**Headers:**

```
Authorization: Bearer <admin-jwt-token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "total_users": 1250,
    "total_trips": 5240,
    "total_stops": 15720,
    "total_activities": 42350,
    "top_cities": [
      {
        "city": "Paris",
        "count": 425
      },
      {
        "city": "London",
        "count": 380
      },
      {
        "city": "Rome",
        "count": 345
      },
      {
        "city": "Barcelona",
        "count": 290
      },
      {
        "city": "Amsterdam",
        "count": 275
      }
    ],
    "average_budget": 1875.5
  }
}
```

---

## Activity Categories

The following activity categories are supported:

- `food` - Restaurants, cafes, food tours
- `transport` - Flights, trains, buses, car rentals
- `accommodation` - Hotels, hostels, Airbnb
- `sightseeing` - Museums, landmarks, tours
- `entertainment` - Shows, concerts, nightlife
- `shopping` - Markets, malls, souvenirs
- `other` - Any other type of activity

---

## Error Codes

| HTTP Status | Error Type            | Description                                     |
| ----------- | --------------------- | ----------------------------------------------- |
| 400         | Bad Request           | Invalid request body or parameters              |
| 401         | Unauthorized          | Authentication required or invalid token        |
| 403         | Forbidden             | Insufficient permissions                        |
| 404         | Not Found             | Resource not found                              |
| 409         | Conflict              | Resource already exists (e.g., duplicate email) |
| 500         | Internal Server Error | Server error                                    |

---

## Rate Limiting

The API implements rate limiting to prevent abuse. Current limits:

- 100 requests per minute per IP for public endpoints
- 1000 requests per minute per authenticated user

---

## Pagination

All list endpoints support pagination with the following query parameters:

- `page`: Page number (starts from 1)
- `limit`: Number of items per page (max 100)

Response includes pagination metadata:

- `page`: Current page number
- `limit`: Items per page
- `total_items`: Total number of items
- `total_pages`: Total number of pages
- `has_next`: Whether there's a next page
- `has_prev`: Whether there's a previous page

---

## Caching

The API uses Redis caching for improved performance:

- Public trips: 5 minutes TTL
- Public trip details: 30 minutes TTL
- User trips: 2 minutes TTL
- Admin stats: 10 minutes TTL
- Trip stops: 15 minutes TTL
- Stop activities: 10 minutes TTL

Cache is automatically invalidated when related data is updated.
