import { IChatMessage, IDayPlan, ITripContext } from "@/types";

// Resolve API base URL from env with sensible default
const API_BASE_URL = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://localhost:8000';

// Generate a UUID compatible with older browsers
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Get a stable conversation id per browser session
function getConversationId(): string {
  const key = 'tc_conversation_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

// Get a stable user id per browser session
function getUserId(): string {
  const key = 'tc_user_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export const chatWithAI = async (messages: IChatMessage[], context: ITripContext): Promise<{
  response: string;
  context: ITripContext;
  itinerary?: IDayPlan[];
  trip_plan?: any;
  ui_actions?: any;
}> => {
  try {
    // Get the last user message (if any)
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.text || '';
    
    // Convert context to user preferences format for our AI backend
    const preferences = {
      budget_max: context.budget_total,
      travel_style: context.accommodation === 'hostel' ? 'budget' : 
                   context.accommodation === '5-star-hotel' ? 'luxury' : 'standard',
      group_size: (context.travelers_adults || 1) + (context.travelers_children || 0),
      destinations: context.destinations,
      duration_days: context.duration_days,
      transport_pref: context.transport_pref,
      dietary_restrictions: context.restrictions || [],
      start_date: context.start_date,
      end_date: context.end_date
    };
    
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: lastUserMessage,
        user_id: getUserId(),
        conversation_id: getConversationId(),
        context: context,
        preferences: preferences,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to get response from AI');
    }

    const data = await response.json();
    
    // Transform the response to match the expected format
    // Our AI backend returns: { message, ui_actions, trip_plan, conversation_id }
    let transformedItinerary = null;
    
    if (data.trip_plan && data.trip_plan.cities) {
      // Transform the backend trip plan to match frontend IDayPlan[] format
      transformedItinerary = data.trip_plan.cities.flatMap((city: any) => 
        city.days.map((day: any) => ({
          id: `d${day.day_number}`,
          date: day.date,
          city: city.city_name,
          budget: day.daily_budget_total,
          activities: day.activities.map((activity: any) => ({
            id: activity.activity_id,
            time: activity.time,
            name: activity.name,
            cost: activity.estimated_cost,
            weather: activity.weather_summary || 'sunny',
            crowd: (activity.crowd_score || 50) / 100 // Convert to 0-1 scale
          }))
        }))
      );
    }
    
    return {
      response: data.message,
      context: {
        ...context,
        // Update context with any new information from the AI response
        ...(data.trip_plan ? {
          destinations: data.trip_plan.cities?.map((c: any) => c.city_name.toLowerCase()) || context.destinations,
          duration_days: data.trip_plan.total_days || context.duration_days,
          budget_total: data.trip_plan.total_budget || context.budget_total,
          currency: data.trip_plan.currency || context.currency,
          start_date: data.trip_plan.start_date || context.start_date,
          end_date: data.trip_plan.end_date || context.end_date
        } : {})
      },
      itinerary: transformedItinerary,
      ui_actions: data.ui_actions
    };
  } catch (error) {
    console.error('Error calling chat API:', error);
    throw error;
  }
};

export const generateItinerary = async (context: ITripContext): Promise<IDayPlan[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-itinerary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(context),
    });

    if (!response.ok) {
      throw new Error('Failed to generate itinerary');
    }

    const data = await response.json();
    return data.itinerary;
  } catch (error) {
    console.error('Error generating itinerary:', error);
    throw error;
  }
};

// Voice input support
export const processVoiceInput = async (audioBlob: Blob): Promise<{
  transcription: string;
  intent: string;
  confidence: number;
}> => {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice.wav');
    formData.append('user_id', getUserId());

    const response = await fetch(`${API_BASE_URL}/api/voice`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to process voice input');
    }

    return await response.json();
  } catch (error) {
    console.error('Error processing voice input:', error);
    throw error;
  }
};

// Advanced AI features
export const findBestCombinations = async (destination: string, preferences: any): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/combinations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destination,
        preferences,
        user_id: getUserId(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to find combinations');
    }

    return await response.json();
  } catch (error) {
    console.error('Error finding combinations:', error);
    throw error;
  }
};

export const getTravelAlerts = async (destinations: string[]): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destinations,
        user_id: getUserId(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get travel alerts');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting travel alerts:', error);
    throw error;
  }
};

export const getAITravelTips = async (destination: string, context: any): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/tips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destination,
        context,
        user_id: getUserId(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get AI travel tips');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting AI travel tips:', error);
    throw error;
  }
};

// User preferences management
export const getUserPreferences = async (): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/preferences/${getUserId()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user preferences');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting user preferences:', error);
    throw error;
  }
};

export const updateUserPreferences = async (preferences: any): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/preferences/${getUserId()}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      throw new Error('Failed to update user preferences');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
};

// Blacklist management
export const getUserBlacklist = async (): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/blacklist/user/${getUserId()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user blacklist');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting user blacklist:', error);
    throw error;
  }
};

export const addToBlacklist = async (item: { type: string; value: string; reason?: string }): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/blacklist/user/${getUserId()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      throw new Error('Failed to add to blacklist');
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding to blacklist:', error);
    throw error;
  }
};

export const removeFromBlacklist = async (itemId: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/blacklist/user/${getUserId()}/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to remove from blacklist');
    }

    return await response.json();
  } catch (error) {
    console.error('Error removing from blacklist:', error);
    throw error;
  }
};
