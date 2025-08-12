// Export types with 'export type' for isolatedModules
export type { Activity } from './trip.types';
export type { TripDay } from './trip.types';
export type { BudgetItem } from './trip.types';
export type { Trip } from './trip.types';
export type { TripFormData } from './trip.types';
export type { ActivitySearchResult } from './trip.types';
export type { TripFilterOptions } from './trip.types';
export type { IDayPlan } from './trip.types';
export type { ITripContext } from './trip.types';

// Export travel-related types
export * from './travel';

// Chat message interface
export interface IChatMessage { 
  id: string; 
  role: 'ai' | 'user'; 
  text: string;
};
