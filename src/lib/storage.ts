import { AppState, ThemePreference, User, UUID, LocaleCode } from "@/types";
import type { Trip } from "@/types/trip.types";

const STORAGE_KEY = "globetrotter_app_state_v1";

// Sample trip for testing the itinerary functionality
const sampleTrip: Trip = {
  id: 'sample-trip-001',
  name: 'European Adventure',
  description: 'A wonderful journey through Europe\'s most beautiful cities',
  destination: 'Europe',
  startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
  coverPhotoUrl: '',
  activities: {
    'activity-1': {
      id: 'activity-1',
      title: 'Visit Eiffel Tower',
      description: 'Iconic landmark in Paris',
      location: 'Paris, France',
      startTime: '09:00',
      endTime: '11:00',
      cost: 25,
      category: 'sightseeing',
      notes: '',
      isFlexible: false,
      bookingReference: '',
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    'activity-2': {
      id: 'activity-2',
      title: 'Colosseum Tour',
      description: 'Ancient Roman amphitheatre',
      location: 'Rome, Italy',
      startTime: '14:00',
      endTime: '16:00',
      cost: 35,
      category: 'cultural',
      notes: 'Includes guided tour',
      isFlexible: true,
      bookingReference: 'COL-12345',
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },
  itinerary: [
    {
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      activityIds: ['activity-1'],
      notes: 'First day in Paris!',
      weather: {
        condition: 'sunny',
        temperature: 22,
        unit: 'C',
        icon: '☀️',
      },
    },
    {
      date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      activityIds: ['activity-2'],
      notes: 'Exploring Rome',
      weather: {
        condition: 'partly-cloudy',
        temperature: 25,
        unit: 'C',
        icon: '⛅',
      },
    }
  ],
  budget: [
    { 
      id: 'budget-1', 
      name: 'Flights', 
      amount: 500, 
      category: 'transportation' as const, 
      paid: false,
      currency: 'USD',
      notes: 'Round trip to Paris',
      date: new Date().toISOString(),
    },
    { 
      id: 'budget-2', 
      name: 'Hotels', 
      amount: 1000, 
      category: 'accommodation' as const, 
      paid: false,
      currency: 'USD',
      notes: '7 nights in 4-star hotels',
      date: new Date().toISOString(),
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  userId: 'sample-user-001',
  isPublic: false,
  tags: ['europe', 'summer', 'cultural'],
  collaborators: [],
  settings: {
    currency: 'USD',
    timezone: 'Europe/Paris',
    notifications: true,
  },
};

const defaultState: AppState = {
  user: null,
  trips: {
    'sample-trip-001': sampleTrip
  },
  language: 'en',
  theme: 'system',
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw) as AppState;
    const state = { ...defaultState, ...parsed, trips: parsed.trips || {} };
    
    // Ensure sample trip exists for testing
    if (!state.trips['sample-trip-001']) {
      state.trips['sample-trip-001'] = sampleTrip;
    }
    
    return state;
  } catch {
    return { ...defaultState };
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function upsertUser(user: User | null) {
  const state = loadState();
  state.user = user;
  saveState(state);
}

export function getUser(): User | null {
  return loadState().user;
}

export function getTrips(): Record<UUID, Trip> {
  return loadState().trips;
}

export function upsertTrip(trip: Trip) {
  const state = loadState();
  state.trips[trip.id] = trip;
  saveState(state);
}

export function removeTrip(tripId: UUID) {
  const state = loadState();
  delete state.trips[tripId];
  saveState(state);
}

export function setLanguage(lang: LocaleCode) {
  const state = loadState();
  state.language = lang;
  saveState(state);
}

export function getLanguage(): LocaleCode {
  return loadState().language;
}

export function setTheme(theme: ThemePreference) {
  const state = loadState();
  state.theme = theme;
  saveState(state);
}

export function getTheme(): ThemePreference {
  return loadState().theme;
}


