import os
from typing import Dict, Any, List, Optional
import google.generativeai as genai
from pydantic import BaseModel
from backend.config import settings

# Configure Gemini API
def init_gemini():
    """Initialize the Gemini API with the API key from environment variables."""
    api_key ="AIzaSyAnTMfio9NiDEj_MtEIjkA0LLonu0OhesA"
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    genai.configure(api_key=api_key)
    return genai

class GeminiChat:
    """Wrapper class for Gemini chat interactions."""
    
    def __init__(self, model_name: str = "gemini-1.5-flash"):
        self.genai = init_gemini()
        self.model_name = model_name
        self.model = self.genai.GenerativeModel(model_name)
        self.chat = None
        
    def start_chat(self, system_prompt: str = None):
        """Start a new chat session with an optional system prompt."""
        if system_prompt:
            self.chat = self.model.start_chat(history=[{"role": "user", "parts": [system_prompt]}])
            self.chat.send_message("Understood. I'll follow these instructions.")
        else:
            self.chat = self.model.start_chat(history=[])
        return self.chat
    
    def send_message(self, message: str) -> str:
        """Send a message to the chat and return the response."""
        if not self.chat:
            # Start chat with travel assistant system prompt
            system_prompt = """You are GlobeTrotter AI, a friendly and expert travel planning assistant. 
            Your role is to help users plan amazing trips by providing personalized recommendations, 
            itineraries, and travel advice. Be conversational, helpful, and enthusiastic about travel.
            
            When users greet you, respond warmly and ask about their travel plans.
            When they ask about destinations, provide detailed and helpful information.
            Always be ready to help create detailed travel itineraries."""
            
            self.start_chat(system_prompt)
        
        try:
            response = self.chat.send_message(message)
            return response.text
        except Exception as e:
            return f"Error generating response: {str(e)}"

class ItineraryGenerator:
    """Class to generate travel itineraries using Gemini."""
    
    def __init__(self):
        self.gemini = GeminiChat()
        self.system_prompt = """
        You are GlobeTrotter AI, an expert travel planning assistant. Your task is to help users plan their trips by generating detailed itineraries.
        
        When creating an itinerary, include:
        1. Daily activities with time slots
        2. Recommended places to visit
        3. Estimated costs
        4. Travel times between locations
        5. Weather-appropriate suggestions
        
        Format your response as a structured JSON object following this schema:
        {
            "days": [
                {
                    "day_number": 1,
                    "date": "YYYY-MM-DD",
                    "activities": [
                        {
                            "time": "HH:MM",
                            "name": "Activity name",
                            "description": "Detailed description",
                            "location": "Location name",
                            "estimated_cost": 0.0,
                            "duration_minutes": 0,
                            "notes": "Any additional notes"
                        }
                    ]
                }
            ],
            "total_estimated_cost": 0.0,
            "currency": "USD",
            "recommendations": []
        }
        """
        self.gemini.start_chat(self.system_prompt)
    
    def generate_itinerary(self, user_input: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a travel itinerary based on user input."""
        try:
            # Format the user input as a prompt
            prompt = f"""
            Create a detailed travel itinerary based on the following information:
            
            Destination: {user_input.get('destination', 'Not specified')}
            Travel Dates: {user_input.get('start_date', 'Not specified')} to {user_input.get('end_date', 'Not specified')}
            Travelers: {user_input.get('travelers', 'Not specified')}
            Budget: {user_input.get('budget', 'Not specified')}
            Preferences: {user_input.get('preferences', 'None')}
            
            Please generate a detailed itinerary including activities, timings, and estimated costs.
            """
            
            # Get the response from Gemini
            response = self.gemini.send_message(prompt)
            
            # Process the response to extract JSON
            # In a real implementation, you'd want to validate and parse the JSON
            return {
                "status": "success",
                "itinerary": response,
                "raw_response": response
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to generate itinerary: {str(e)}"
            }
