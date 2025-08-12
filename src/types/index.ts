export * from './travel';

export interface IActivity {
  id: string;
  time: string;
  name: string;
  cost: number;
  weather: string;
  crowd?: number;
  thumb?: string;
};

export interface IDayPlan {
  id: string;
  date: string;
  city: string;
  budget: number;
  activities: Activity[];
};

export interface IChatMessage { 
  id: string; 
  role: 'ai' | 'user'; 
  text: string;
};

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
};
