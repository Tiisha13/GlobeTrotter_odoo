import { City } from "@/types/city";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Helper function to handle API responses
async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Something went wrong');
  }
  return response.json();
}

export const cityService = {
  // Search for cities with optional filters
  async searchCities(
    query: string = '',
    filters: {
      country?: string;
      minRating?: number;
      maxCost?: number;
      tags?: string[];
    } = {},
    limit: number = 20,
    skip: number = 0
  ): Promise<{ items: City[]; total: number }> {
    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
      skip: skip.toString(),
      ...(filters.country && { country: filters.country }),
      ...(filters.minRating !== undefined && { min_rating: filters.minRating.toString() }),
      ...(filters.maxCost !== undefined && { max_cost: filters.maxCost.toString() }),
      ...(filters.tags?.length && { tags: filters.tags.join(',') }),
    });

    const response = await fetch(`${API_BASE_URL}/api/cities?${params.toString()}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const items = await handleResponse(response);
    return {
      items,
      total: parseInt(response.headers.get('X-Total-Count') || '0', 10),
    };
  },

  // Get featured cities
  async getFeaturedCities(limit: number = 10): Promise<City[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/cities/featured?limit=${limit}`,
      {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return handleResponse(response);
  },

  // Get cities by country
  async getCitiesByCountry(countryCode: string): Promise<City[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/cities/country/${countryCode}`,
      {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return handleResponse(response);
  },

  // Get city suggestions for autocomplete
  async getCitySuggestions(query: string, limit: number = 5): Promise<Array<{
    id: string;
    name: string;
    country: string;
    country_code: string;
    image_url?: string;
  }>> {
    const response = await fetch(
      `${API_BASE_URL}/api/cities/autocomplete?q=${encodeURIComponent(query)}&limit=${limit}`,
      {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return handleResponse(response);
  },

  // Get city by ID
  async getCityById(cityId: string): Promise<City> {
    const response = await fetch(`${API_BASE_URL}/api/cities/${cityId}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse(response);
  },

  // Admin only - Create a new city
  async createCity(cityData: Partial<City>): Promise<City> {
    const response = await fetch(`${API_BASE_URL}/api/cities`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cityData),
    });
    return handleResponse(response);
  },

  // Admin only - Update a city
  async updateCity(cityId: string, cityData: Partial<City>): Promise<City> {
    const response = await fetch(`${API_BASE_URL}/api/cities/${cityId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cityData),
    });
    return handleResponse(response);
  },

  // Admin only - Delete a city
  async deleteCity(cityId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/cities/${cityId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete city');
    }
  },
};

export default cityService;
