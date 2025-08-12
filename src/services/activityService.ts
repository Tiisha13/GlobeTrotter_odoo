import { Activity } from '@/types/trip';

// Mock data for activities
const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'act1',
    name: 'Eiffel Tower Visit',
    category: 'sightseeing',
    location: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France',
    notes: 'Iconic landmark with observation decks and city views',
    startTime: new Date().toISOString(),
    cost: 26,
    website: 'https://www.toureiffel.paris/en'
  },
  {
    id: 'act2',
    name: 'Louvre Museum',
    category: 'museum',
    location: 'Rue de Rivoli, 75001 Paris, France',
    notes: 'World\'s largest art museum, home to the Mona Lisa',
    startTime: new Date().toISOString(),
    cost: 17,
    website: 'https://www.louvre.fr/'
  },
  {
    id: 'act3',
    name: 'Seine River Cruise',
    category: 'tour',
    location: 'Port de la Bourdonnais, 75007 Paris, France',
    notes: 'Scenic boat tour with views of Parisian landmarks',
    startTime: new Date().toISOString(),
    cost: 15,
    website: 'https://www.bateauxparisiens.com/'
  },
  {
    id: 'act4',
    name: 'Montmartre Walking Tour',
    category: 'tour',
    location: 'Meeting Point: Blanche Metro Station, Paris',
    notes: 'Explore the artistic neighborhood with a local guide',
    startTime: new Date().toISOString(),
    cost: 25,
    website: 'https://www.montmartre-paris.com/'
  },
  {
    id: 'act5',
    name: 'Versailles Palace & Gardens',
    category: 'sightseeing',
    location: 'Place d\'Armes, 78000 Versailles, France',
    notes: 'Royal palace with stunning gardens, about 1 hour from Paris',
    startTime: new Date().toISOString(),
    cost: 27,
    website: 'http://en.chateauversailles.fr/'
  },
  {
    id: 'act6',
    name: 'Moulin Rouge Show',
    category: 'entertainment',
    location: '82 Boulevard de Clichy, 75018 Paris, France',
    notes: 'World-famous cabaret show, dress code applies',
    startTime: new Date().toISOString(),
    cost: 99,
    website: 'https://www.moulinrouge.fr/'
  },
  {
    id: 'act7',
    name: 'Sainte-Chapelle',
    category: 'sightseeing',
    location: '10 Bd du Palais, 75001 Paris, France',
    notes: 'Gothic chapel with stunning stained glass windows',
    startTime: new Date().toISOString(),
    cost: 11.5,
    website: 'http://www.sainte-chapelle.fr/'
  },
  {
    id: 'act8',
    name: 'Paris Food Tour',
    category: 'food',
    location: 'Various locations in Le Marais',
    notes: 'Sample French pastries, cheese, wine, and more',
    startTime: new Date().toISOString(),
    cost: 85,
    website: 'https://www.parisbyem.com/'
  },
  {
    id: 'act9',
    name: 'Catacombs of Paris',
    category: 'sightseeing',
    location: '1 Av. du Colonel Henri Rol-Tanguy, 75014 Paris',
    notes: 'Underground ossuaries holding remains of more than six million people',
    startTime: new Date().toISOString(),
    cost: 29,
    website: 'https://www.catacombes.paris.fr/'
  },
  {
    id: 'act10',
    name: 'Arc de Triomphe',
    category: 'sightseeing',
    location: 'Pl. Charles de Gaulle, 75008 Paris, France',
    notes: 'Iconic monument with panoramic views from the top',
    startTime: new Date().toISOString(),
    cost: 13,
    website: 'http://www.paris-arc-de-triomphe.fr/'
  }
];

// Categories for filtering
const ACTIVITY_CATEGORIES = [
  { id: 'all', name: 'All Categories' },
  { id: 'sightseeing', name: 'Sightseeing' },
  { id: 'museum', name: 'Museums' },
  { id: 'tour', name: 'Tours' },
  { id: 'food', name: 'Food & Drink' },
  { id: 'shopping', name: 'Shopping' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'outdoor', name: 'Outdoor Activities' },
  { id: 'transport', name: 'Transportation' },
  { id: 'accommodation', name: 'Accommodation' },
  { id: 'other', name: 'Other' }
];

// Mock API call to search for activities
export const searchActivities = async (query: string, category: string = 'all'): Promise<Activity[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Filter by search query
  let results = MOCK_ACTIVITIES;
  
  if (query) {
    const searchLower = query.toLowerCase();
    results = results.filter(activity => 
      activity.name.toLowerCase().includes(searchLower) ||
      (activity.notes && activity.notes.toLowerCase().includes(searchLower)) ||
      (activity.location && activity.location.toLowerCase().includes(searchLower))
    );
  }
  
  // Filter by category
  if (category && category !== 'all') {
    results = results.filter(activity => activity.category === category);
  }
  
  return results;
};

// Get activity by ID
export const getActivityById = async (id: string): Promise<Activity | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return MOCK_ACTIVITIES.find(activity => activity.id === id);
};

// Get all activity categories
export const getActivityCategories = () => {
  return ACTIVITY_CATEGORIES;
};

// Save an activity to the itinerary
export const saveActivityToItinerary = async (tripId: string, activity: Omit<Activity, 'id'>, date: Date): Promise<Activity> => {
  // In a real app, this would be an API call to save to the backend
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Create a new activity with an ID and set the date
  const newActivity: Activity = {
    ...activity,
    id: `act-${Date.now()}`,
    startTime: new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      new Date(activity.startTime).getHours(),
      new Date(activity.startTime).getMinutes()
    ).toISOString(),
    // If there's an end time, update it to be on the same day
    endTime: activity.endTime ? new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      new Date(activity.endTime).getHours(),
      new Date(activity.endTime).getMinutes()
    ).toISOString() : undefined
  };
  
  // In a real app, we would save this to the backend
  console.log(`Saving activity to trip ${tripId}:`, newActivity);
  
  return newActivity;
};
