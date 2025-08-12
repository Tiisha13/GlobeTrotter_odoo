import { AppState, ThemePreference, Trip, User, UUID, LocaleCode } from "@/types";

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
      name: 'Visit Eiffel Tower',
      description: 'Iconic landmark in Paris',
      location: 'Paris, France',
      startTime: '09:00',
      endTime: '11:00',
      cost: 25,
      category: 'sightseeing',
    },
    'activity-2': {
      id: 'activity-2',
      name: 'Colosseum Tour',
      description: 'Ancient Roman amphitheatre',
      location: 'Rome, Italy',
      startTime: '14:00',
      endTime: '16:00',
      cost: 35,
      category: 'cultural',
    }
  },
  itinerary: [
    {
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      activities: [{
        id: 'activity-1',
        name: 'Visit Eiffel Tower',
        description: 'Iconic landmark in Paris',
        location: 'Paris, France',
        startTime: '09:00',
        endTime: '11:00',
        cost: 25,
        category: 'sightseeing',
      }],
    },
    {
      date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      activities: [{
        id: 'activity-2',
        name: 'Colosseum Tour',
        description: 'Ancient Roman amphitheatre',
        location: 'Rome, Italy',
        startTime: '14:00',
        endTime: '16:00',
        cost: 35,
        category: 'cultural',
      }],
    }
  ],
  budget: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  userId: 'sample-user',
  isPublic: false,
  tags: ['europe', 'culture', 'adventure'],
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


