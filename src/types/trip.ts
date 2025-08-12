export interface Activity {
  id: string;
  name: string;
  description?: string;
  location: string;
  startTime: string | Date;
  endTime?: string | Date;
  cost?: number;
  category: string;
  notes?: string;
  bookingReference?: string;
  imageUrl?: string;
  website?: string;
  order?: number; // Added for drag and drop ordering
}

export interface TripDay {
  date: string;
  activities: Activity[];
  notes?: string;
}

export interface BudgetItem {
  id: string;
  name: string;
  amount: number;
  category: 'accommodation' | 'transport' | 'food' | 'activities' | 'shopping' | 'other';
  date: string;
  notes?: string;
  paid: boolean;
}

export interface Trip {
  id: string;
  name: string;
  description: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverPhotoUrl?: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
  isPublic: boolean;
  activities: Record<string, Activity>;
  itinerary: TripDay[];
  budget: BudgetItem[];
  tags?: string[];
  collaborators?: string[];
}

export interface TripFormData extends Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'activities' | 'itinerary' | 'budget' | 'userId'> {
  // Form specific fields can be added here
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
