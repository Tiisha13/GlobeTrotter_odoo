export interface City {
  id: string;
  name: string;
  country: string;
  country_code?: string;
  image?: string;
  image_url?: string;
  // Cost fields
  averageDailyCost?: number; // preferred by frontend
  dailyBudget?: number; // alternate naming from some endpoints
  // Meta/details
  description?: string;
  attractions?: string[];
  bestMonths?: string[];
  // Optional fields that some endpoints may return
  popularity?: number;
  rating?: number;
}

export default City;
