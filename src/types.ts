export type UUID = string;

export type BudgetCategory = {
  id: UUID;
  name: string;
  amount: number; // in chosen currency's minor units? For demo we store as number in main units
};

export type Activity = {
  id: UUID;
  title: string;
  description?: string;
  date?: string; // ISO yyyy-mm-dd
};

export type ItineraryDay = {
  date: string; // ISO yyyy-mm-dd
  activityIds: UUID[];
};

export type Trip = {
  id: UUID;
  name: string;
  description?: string;
  startDate?: string; // ISO yyyy-mm-dd
  endDate?: string; // ISO yyyy-mm-dd
  coverPhotoDataUrl?: string; // stored as data URL for demo purposes
  activities: Record<UUID, Activity>;
  itinerary: ItineraryDay[];
  budget: BudgetCategory[];
  createdAt: number;
  updatedAt: number;
};

export type User = {
  id: UUID;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarDataUrl?: string;
  createdAt: number;
};

export type AppState = {
  user: User | null;
  trips: Record<UUID, Trip>;
  language: LocaleCode;
  theme: ThemePreference;
};

export type ThemePreference = 'light' | 'dark' | 'system';

export type LocaleCode = 'en' | 'es' | 'fr';


