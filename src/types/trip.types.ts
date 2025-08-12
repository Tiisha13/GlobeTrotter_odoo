import { Activity as BaseActivity } from './trip';

// Re-export all types from trip.ts
export * from './trip';

// Activity interface for trip activities
export interface Activity {
  id: string;
  title: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
  cost: number;
  category: string;
  notes: string;
  isFlexible: boolean;
  bookingReference: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WeatherInfo {
  condition: string;
  temperature: number;
  unit: string;
  icon: string;
}

export interface TripDay {
  date: string;
  activityIds: string[];
  notes: string;
  weather?: WeatherInfo;
}

export type BudgetCategory = 'accommodation' | 'transportation' | 'food' | 'activities' | 'shopping' | 'other';

export interface BudgetItem {
  id: string;
  name: string;
  amount: number;
  category: BudgetCategory;
  date: string;
  notes: string;
  paid: boolean;
  currency: string;
}

export interface TripSettings {
  currency: string;
  timezone: string;
  notifications: boolean;
}

export interface Trip {
  id: string;
  name: string;
  description: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverPhotoUrl: string;
  activities: Record<string, Activity>;
  itinerary: TripDay[];
  budget: BudgetItem[];
  createdAt: string;
  updatedAt: string;
  userId: string;
  isPublic: boolean;
  tags: string[];
  collaborators: string[];
  settings: TripSettings;
}

export interface TripFormData extends Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'activities' | 'itinerary' | 'budget' | 'userId' | 'settings' | 'collaborators' | 'startDate' | 'endDate'> {
  // Form specific fields can be added here
  startDate: Date | string;
  endDate: Date | string;
}

export interface ActivitySearchResult {
  id: string;
  name: string;
  location: string;
  description: string;
  category: string;
  imageUrl?: string;
  priceRange?: string;
  rating?: number;
  duration?: string;
}

export interface TripFilterOptions {
  destination?: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  sortBy?: 'date' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// For backward compatibility
export interface IDayPlan {
  id: string;
  date: string;
  city: string;
  budget: number;
  activities: Activity[];
}

export interface ITripContext {
  destinations?: string[];
  start_date?: string;
  end_date?: string;
  duration_days?: number;
  budget_total?: number;
  currency?: string;
  travelers_adults?: number;
  travelers_children?: number;
  transport_pref?: 'train' | 'bus' | 'flight' | 'any' | 'not_sure';
  accommodation?: string;
  restrictions?: string[];
  eco_mode?: boolean;
}
