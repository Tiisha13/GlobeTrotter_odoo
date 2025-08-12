"""
LangChain tools for integrating external APIs (Google Search, Weather, Hotels, Maps).
These tools are used by the LangGraph workflow for travel planning.
"""

from typing import Dict, Any, List, Optional
from langchain_core.tools import BaseTool
# from langchain_community.utilities import GoogleSearchAPIWrapper  # Optional - comment out for now
import requests
import json
import asyncio
import logging
from datetime import datetime, timedelta
import aiohttp

from ..config import settings

logger = logging.getLogger(__name__)

class GoogleSearchTool(BaseTool):
    """Tool for searching destinations and attractions using Google Search API"""
    
    name: str = "google_search"
    description: str = "Search for travel destinations, attractions, and travel information using Google Search"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Initialize search wrapper as a private attribute to avoid Pydantic issues
        self._search = None  # GoogleSearchAPIWrapper() when available
    
    def _run(self, query: str) -> str:
        """Execute Google search"""
        try:
            # For now, return mock search results since Google Search API is optional
            if self._search is None:
                return self._get_mock_search_results(query)
            
            # Add travel-specific context to search
            travel_query = f"travel destination {query} attractions things to do"
            results = self._search.run(travel_query)
            return results
        except Exception as e:
            logger.error(f"Google search error: {e}")
            return self._get_mock_search_results(query)
    
    def _get_mock_search_results(self, query: str) -> str:
        """Return mock search results when Google Search API is not available"""
        mock_destinations = {
            "goa": "Goa is a popular beach destination in India known for its beautiful beaches, Portuguese architecture, and vibrant nightlife. Top attractions include Baga Beach, Old Goa churches, and spice plantations.",
            "paris": "Paris, the City of Light, offers iconic landmarks like the Eiffel Tower, Louvre Museum, and Notre-Dame Cathedral. Perfect for romantic getaways and cultural experiences.",
            "tokyo": "Tokyo combines traditional Japanese culture with modern innovation. Visit temples, experience sushi culture, and explore districts like Shibuya and Harajuku.",
            "bali": "Bali offers stunning beaches, ancient temples, lush rice terraces, and vibrant culture. Popular areas include Ubud, Seminyak, and Canggu."
        }
        
        query_lower = query.lower()
        for destination, description in mock_destinations.items():
            if destination in query_lower:
                return f"Search results for {query}: {description}"
        
        return f"Search results for {query}: Beautiful destination with many attractions, local culture, and great food options. Perfect for travelers seeking adventure and relaxation."
    
    async def _arun(self, query: str) -> str:
        """Async version of Google search"""
        return self._run(query)

class WeatherTool(BaseTool):
    """Tool for fetching weather forecasts using OpenWeatherMap API"""
    
    name: str = "weather_forecast"
    description: str = "Get weather forecast for travel destinations"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._api_key = settings.OPENWEATHER_API_KEY
        self._base_url = "http://api.openweathermap.org/data/2.5"
    
    def _run(self, location: str, days: int = 7) -> str:
        """Get weather forecast for location"""
        try:
            if not self._api_key:
                return self._get_mock_weather_data(location, days)
            
            # Get current weather
            current_url = f"{self._base_url}/weather"
            current_params = {
                "q": location,
                "appid": self._api_key,
                "units": "metric"
            }
            
            current_response = requests.get(current_url, params=current_params)
            current_data = current_response.json()
            
            if current_response.status_code != 200:
                return self._get_mock_weather_data(location, days)
            
            # Get forecast
            forecast_url = f"{self._base_url}/forecast"
            forecast_params = {
                "q": location,
                "appid": self._api_key,
                "units": "metric",
                "cnt": min(days * 8, 40)  # 8 forecasts per day, max 40
            }
            
            forecast_response = requests.get(forecast_url, params=forecast_params)
            forecast_data = forecast_response.json()
            
            # Format weather information
            weather_info = {
                "location": location,
                "current": {
                    "temperature": current_data["main"]["temp"],
                    "description": current_data["weather"][0]["description"],
                    "humidity": current_data["main"]["humidity"],
                    "wind_speed": current_data["wind"]["speed"]
                },
                "forecast": []
            }
            
            if forecast_response.status_code == 200:
                for item in forecast_data["list"][:days*2]:  # 2 forecasts per day
                    weather_info["forecast"].append({
                        "date": item["dt_txt"],
                        "temperature": item["main"]["temp"],
                        "description": item["weather"][0]["description"],
                        "humidity": item["main"]["humidity"]
                    })
            
            return json.dumps(weather_info, indent=2)
            
        except Exception as e:
            logger.error(f"Weather API error: {e}")
            return self._get_mock_weather_data(location, days)
    
    def _get_mock_weather_data(self, location: str, days: int = 7) -> str:
        """Return mock weather data when API is not available"""
        import random
        from datetime import datetime, timedelta
        
        # Generate realistic mock weather data
        base_temp = 25  # Base temperature in Celsius
        weather_conditions = ["sunny", "partly cloudy", "cloudy", "light rain", "clear"]
        
        weather_info = {
            "location": location,
            "current": {
                "temperature": base_temp + random.randint(-5, 10),
                "description": random.choice(weather_conditions),
                "humidity": random.randint(40, 80),
                "wind_speed": random.randint(5, 15)
            },
            "forecast": []
        }
        
        # Generate forecast for next few days
        for i in range(min(days, 7)):
            date = datetime.now() + timedelta(days=i)
            weather_info["forecast"].append({
                "date": date.strftime("%Y-%m-%d %H:%M:%S"),
                "temperature": base_temp + random.randint(-3, 8),
                "description": random.choice(weather_conditions),
                "humidity": random.randint(40, 80)
            })
        
        return json.dumps(weather_info, indent=2)
    
    async def _arun(self, location: str, days: int = 7) -> str:
        """Async version of weather forecast"""
        return self._run(location, days)

class HotelSearchTool(BaseTool):
    """Tool for searching hotels using various hotel APIs"""
    
    name: str = "hotel_search"
    description: str = "Search for hotels with filtering by price, rating, and location"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # This would integrate with actual hotel APIs like Booking.com, Amadeus, etc.
        # For now, we'll simulate hotel data
    
    def _run(self, location: str, checkin: str = None, checkout: str = None, 
             sort_by: str = "price", max_results: int = 10) -> str:
        """Search for hotels in location"""
        try:
            # Simulate hotel search results
            # In production, this would call actual hotel APIs
            hotels = self._simulate_hotel_search(location, sort_by, max_results)
            
            return json.dumps({
                "location": location,
                "checkin": checkin,
                "checkout": checkout,
                "sort_by": sort_by,
                "hotels": hotels
            }, indent=2)
            
        except Exception as e:
            logger.error(f"Hotel search error: {e}")
            return f"Error searching hotels: {str(e)}"
    
    def _simulate_hotel_search(self, location: str, sort_by: str, max_results: int) -> List[Dict]:
        """Simulate hotel search results"""
        # This is mock data - replace with actual API calls
        base_hotels = [
            {
                "hotel_id": f"hotel_{i}",
                "name": f"Hotel {location} {i}",
                "rating": 3.5 + (i % 3) * 0.5,
                "price_per_night": 80 + (i * 20),
                "currency": "USD",
                "distance_from_center_km": 1.0 + (i * 0.5),
                "amenities": ["WiFi", "Pool", "Gym"],
                "booking_link": f"https://booking.example.com/hotel_{i}",
                "blacklisted": False
            }
            for i in range(1, max_results + 1)
        ]
        
        # Sort based on criteria
        if sort_by == "price":
            base_hotels.sort(key=lambda x: x["price_per_night"])
        elif sort_by == "rating":
            base_hotels.sort(key=lambda x: x["rating"], reverse=True)
        elif sort_by == "distance":
            base_hotels.sort(key=lambda x: x["distance_from_center_km"])
        
        return base_hotels
    
    async def _arun(self, location: str, checkin: str = None, checkout: str = None,
                   sort_by: str = "price", max_results: int = 10) -> str:
        """Async version of hotel search"""
        return self._run(location, checkin, checkout, sort_by, max_results)

class RouteSearchTool(BaseTool):
    """Tool for finding transportation routes using Google Maps API"""
    
    name: str = "route_search"
    description: str = "Find transportation routes and travel times between locations"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # This would use Google Maps API or similar
        self._maps_api_key = getattr(settings, 'GOOGLE_MAPS_API_KEY', None)
    
    def _run(self, origin: str, destination: str, mode: str = "driving") -> str:
        """Find routes between origin and destination"""
        try:
            # Simulate route data
            # In production, this would call Google Maps API
            route_data = self._simulate_route_search(origin, destination, mode)
            
            return json.dumps(route_data, indent=2)
            
        except Exception as e:
            logger.error(f"Route search error: {e}")
            return f"Error finding routes: {str(e)}"
    
    def _simulate_route_search(self, origin: str, destination: str, mode: str) -> Dict:
        """Simulate route search results"""
        # Mock route data - replace with actual API calls
        base_duration = 120  # minutes
        base_distance = 100  # km
        
        if mode == "flying":
            duration = base_duration // 3
            cost = 200
        elif mode == "driving":
            duration = base_duration
            cost = 50
        elif mode == "train":
            duration = base_duration + 30
            cost = 80
        else:  # bus
            duration = base_duration + 60
            cost = 30
        
        return {
            "origin": origin,
            "destination": destination,
            "mode": mode,
            "duration_minutes": duration,
            "distance_km": base_distance,
            "estimated_cost": cost,
            "currency": "USD",
            "routes": [
                {
                    "route_id": f"route_1_{mode}",
                    "duration_minutes": duration,
                    "distance_km": base_distance,
                    "cost": cost,
                    "steps": [
                        f"Start from {origin}",
                        f"Travel via {mode}",
                        f"Arrive at {destination}"
                    ]
                }
            ]
        }
    
    async def _arun(self, origin: str, destination: str, mode: str = "driving") -> str:
        """Async version of route search"""
        return self._run(origin, destination, mode)

class BudgetEstimatorTool(BaseTool):
    """Tool for estimating trip budgets based on destinations, hotels, and activities"""
    
    name: str = "budget_estimator"
    description: str = "Estimate total trip budget including accommodation, transport, food, and activities"
    
    def _run(self, trip_data: str) -> str:
        """Estimate budget for trip"""
        try:
            # Parse trip data
            if isinstance(trip_data, str):
                data = json.loads(trip_data) if trip_data.startswith('{') else {"raw": trip_data}
            else:
                data = trip_data
            
            # Extract key information
            destinations = data.get("destinations", [])
            hotels = data.get("hotels", [])
            routes = data.get("routes", [])
            duration_days = data.get("duration_days", 7)
            
            # Calculate budget estimates
            budget_breakdown = self._calculate_budget(destinations, hotels, routes, duration_days)
            
            return json.dumps(budget_breakdown, indent=2)
            
        except Exception as e:
            logger.error(f"Budget estimation error: {e}")
            return f"Error estimating budget: {str(e)}"
    
    def _calculate_budget(self, destinations: List, hotels: List, routes: List, days: int) -> Dict:
        """Calculate detailed budget breakdown"""
        # Base daily costs (these would be location-specific in production)
        daily_food_cost = 50
        daily_activity_cost = 40
        
        # Hotel costs
        hotel_cost = 0
        if hotels:
            avg_hotel_price = sum(h.get("price_per_night", 100) for h in hotels) / len(hotels)
            hotel_cost = avg_hotel_price * days
        else:
            hotel_cost = 100 * days  # Default estimate
        
        # Transportation costs
        transport_cost = 0
        if routes:
            transport_cost = sum(r.get("estimated_cost", 50) for r in routes)
        else:
            transport_cost = 100  # Default estimate
        
        # Food and activities
        food_cost = daily_food_cost * days
        activity_cost = daily_activity_cost * days
        
        # Total budget
        total_budget = hotel_cost + transport_cost + food_cost + activity_cost
        
        return {
            "total_budget": total_budget,
            "currency": "USD",
            "duration_days": days,
            "breakdown": {
                "accommodation": hotel_cost,
                "transportation": transport_cost,
                "food": food_cost,
                "activities": activity_cost
            },
            "daily_average": total_budget / days,
            "budget_alerts": self._generate_budget_alerts(total_budget, days)
        }
    
    def _generate_budget_alerts(self, total_budget: float, days: int) -> List[str]:
        """Generate budget alerts and tips"""
        alerts = []
        daily_avg = total_budget / days
        
        if daily_avg > 200:
            alerts.append("High daily budget - consider budget accommodations")
        elif daily_avg < 50:
            alerts.append("Very low budget - verify cost estimates")
        
        if total_budget > 2000:
            alerts.append("Consider travel insurance for high-value trip")
        
        return alerts
    
    async def _arun(self, trip_data: str) -> str:
        """Async version of budget estimation"""
        return self._run(trip_data)

# Export all tools for easy import
__all__ = [
    'GoogleSearchTool',
    'WeatherTool', 
    'HotelSearchTool',
    'RouteSearchTool',
    'BudgetEstimatorTool'
]
