import { Trip, Activity, BudgetItem } from "@/types/trip";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Helper function to handle API responses
async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Something went wrong');
  }
  return response.json();
}

// Trip related API calls
export const tripService = {
  // Get all trips for the current user
  async getTrips(limit = 20, skip = 0): Promise<Trip[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/trips?limit=${limit}&skip=${skip}`,
      {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return handleResponse(response);
  },

  // Get a single trip by ID
  async getTripById(tripId: string): Promise<Trip> {
    const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse(response);
  },

  // Create a new trip
  async createTrip(tripData: Partial<Trip>): Promise<Trip> {
    const response = await fetch(`${API_BASE_URL}/api/trips`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tripData),
    });
    return handleResponse(response);
  },

  // Update an existing trip
  async updateTrip(tripId: string, tripData: Partial<Trip>): Promise<Trip> {
    const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tripData),
    });
    return handleResponse(response);
  },

  // Delete a trip
  async deleteTrip(tripId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to delete trip');
    }
  },

  // Activity related methods
  async addActivity(
    tripId: string,
    dayDate: string,
    activityData: Partial<Activity>
  ): Promise<Trip> {
    const response = await fetch(
      `${API_BASE_URL}/api/trips/${tripId}/days/${dayDate}/activities`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      }
    );
    return handleResponse(response);
  },

  async updateActivity(
    tripId: string,
    dayDate: string,
    activityId: string,
    activityData: Partial<Activity>
  ): Promise<Trip> {
    const response = await fetch(
      `${API_BASE_URL}/api/trips/${tripId}/days/${dayDate}/activities/${activityId}`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      }
    );
    return handleResponse(response);
  },

  async deleteActivity(
    tripId: string,
    dayDate: string,
    activityId: string
  ): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/api/trips/${tripId}/days/${dayDate}/activities/${activityId}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    );
    if (!response.ok) {
      throw new Error('Failed to delete activity');
    }
  },

  // Budget related methods
  async addBudgetItem(
    tripId: string,
    budgetItem: Partial<BudgetItem>
  ): Promise<Trip> {
    const response = await fetch(
      `${API_BASE_URL}/api/trips/${tripId}/budget`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(budgetItem),
      }
    );
    return handleResponse(response);
  },

  async updateBudgetItem(
    tripId: string,
    itemId: string,
    budgetItem: Partial<BudgetItem>
  ): Promise<Trip> {
    const response = await fetch(
      `${API_BASE_URL}/api/trips/${tripId}/budget/${itemId}`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(budgetItem),
      }
    );
    return handleResponse(response);
  },

  async deleteBudgetItem(tripId: string, itemId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/api/trips/${tripId}/budget/${itemId}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    );
    if (!response.ok) {
      throw new Error('Failed to delete budget item');
    }
  },

  // City-to-trip linking methods
  async addCityToTrip(
    tripId: string,
    cityData: {
      city_id: string;
      name: string;
      country: string;
      start_date?: string;
      end_date?: string;
      notes?: string;
    }
  ): Promise<Trip> {
    const response = await fetch(
      `${API_BASE_URL}/api/trips/${tripId}/cities`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cityData),
      }
    );
    return handleResponse(response);
  },

  async getTripCities(tripId: string): Promise<any[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/trips/${tripId}/cities`,
      {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return handleResponse(response);
  },

  async removeCityFromTrip(tripId: string, cityId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/api/trips/${tripId}/cities/${cityId}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    );
    if (!response.ok) {
      throw new Error('Failed to remove city from trip');
    }
  },
};

export default tripService;
