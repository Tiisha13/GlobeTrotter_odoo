"""
Advanced AI service for travel planning including:
- AI-powered "Cheapest + Best Combination Finder"
- Travel alerts (weather warnings, political unrest)
- AI-generated travel tips
- Smart optimization algorithms
"""

from typing import Dict, Any, List, Optional, Tuple
import logging
import asyncio
from datetime import datetime, timedelta
import json
import requests
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    GOOGLE_GENAI_AVAILABLE = True
except Exception:
    ChatGoogleGenerativeAI = None
    GOOGLE_GENAI_AVAILABLE = False
from langchain_core.prompts import ChatPromptTemplate

from ..config import settings
from ..models import Hotel, TripPlan, CityVisit

logger = logging.getLogger(__name__)

class AdvancedAIService:
    """Advanced AI service for intelligent travel planning"""
    
    def __init__(self):
        # Initialize LLM with graceful fallback
        if GOOGLE_GENAI_AVAILABLE and settings.GEMINI_API_KEY:
            try:
                self.llm = ChatGoogleGenerativeAI(
                    model="gemini-1.5-pro",
                    google_api_key=settings.GEMINI_API_KEY,
                    temperature=0.3  # Lower temperature for more consistent optimization
                )
                logger.info("Advanced AI service initialized with Google Generative AI")
            except Exception as e:
                logger.warning(f"Failed to initialize Google Generative AI in advanced service: {e}")
                self.llm = None
        else:
            # Running in fallback mode is expected in dev without GEMINI_API_KEY
            logger.info("Advanced AI service running without LLM - using fallback responses")
            self.llm = None
        
        # Travel alert sources (in production, use real APIs)
        self.alert_sources = {
            "weather": "https://api.openweathermap.org/data/2.5/alerts",
            "travel_advisory": "https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html",
            "news": "https://newsapi.org/v2/everything"
        }
    
    async def find_best_value_combination(
        self,
        hotels: List[Dict[str, Any]],
        budget_max: float,
        preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """AI-powered cheapest + best combination finder"""
        try:
            if not hotels:
                return {"status": "error", "message": "No hotels provided"}
            
            # Define scoring weights based on preferences
            weights = self._get_optimization_weights(preferences)
            
            # Calculate scores for each hotel
            scored_hotels = []
            for hotel in hotels:
                score = await self._calculate_hotel_score(hotel, weights, budget_max)
                scored_hotels.append({
                    **hotel,
                    "ai_score": score["total_score"],
                    "score_breakdown": score["breakdown"],
                    "value_rating": score["value_rating"]
                })
            
            # Sort by AI score (higher is better)
            scored_hotels.sort(key=lambda x: x["ai_score"], reverse=True)
            
            # Use AI to provide reasoning for recommendations
            reasoning = await self._generate_recommendation_reasoning(
                scored_hotels[:5], preferences, budget_max
            )
            
            return {
                "status": "success",
                "recommended_hotels": scored_hotels[:5],
                "best_value_pick": scored_hotels[0] if scored_hotels else None,
                "ai_reasoning": reasoning,
                "optimization_weights": weights,
                "total_analyzed": len(hotels)
            }
            
        except Exception as e:
            logger.error(f"Error finding best value combination: {e}")
            return {"status": "error", "message": str(e)}
    
    def _get_optimization_weights(self, preferences: Dict[str, Any]) -> Dict[str, float]:
        """Get optimization weights based on user preferences"""
        # Default weights
        weights = {
            "price": 0.4,
            "rating": 0.3,
            "location": 0.2,
            "amenities": 0.1
        }
        
        # Adjust based on preferences
        travel_style = preferences.get("travel_style", "").lower()
        
        if travel_style == "budget":
            weights.update({"price": 0.6, "rating": 0.2, "location": 0.15, "amenities": 0.05})
        elif travel_style == "luxury":
            weights.update({"price": 0.1, "rating": 0.5, "location": 0.2, "amenities": 0.2})
        elif travel_style == "business":
            weights.update({"price": 0.2, "rating": 0.3, "location": 0.4, "amenities": 0.1})
        
        # Adjust for budget constraints
        budget_max = preferences.get("budget_max", 1000)
        if budget_max < 500:
            weights["price"] += 0.2
            weights["rating"] -= 0.1
        
        return weights
    
    async def _calculate_hotel_score(
        self,
        hotel: Dict[str, Any],
        weights: Dict[str, float],
        budget_max: float
    ) -> Dict[str, Any]:
        """Calculate AI score for a hotel"""
        try:
            # Price score (inverse - lower price is better)
            price = hotel.get("price_per_night", 100)
            price_score = max(0, (budget_max - price) / budget_max) if budget_max > 0 else 0.5
            
            # Rating score (normalized to 0-1)
            rating = hotel.get("rating", 3.0)
            rating_score = min(rating / 5.0, 1.0)
            
            # Location score (inverse distance - closer to center is better)
            distance = hotel.get("distance_from_center_km", 5.0)
            location_score = max(0, (10 - distance) / 10)  # Assume 10km is max reasonable distance
            
            # Amenities score
            amenities = hotel.get("amenities", [])
            important_amenities = ["WiFi", "Pool", "Gym", "Spa", "Restaurant", "Bar"]
            amenities_score = len([a for a in amenities if a in important_amenities]) / len(important_amenities)
            
            # Calculate weighted total score
            total_score = (
                weights["price"] * price_score +
                weights["rating"] * rating_score +
                weights["location"] * location_score +
                weights["amenities"] * amenities_score
            )
            
            # Value rating (price vs quality)
            value_rating = (rating_score + location_score + amenities_score) / (price / 100)
            
            return {
                "total_score": total_score,
                "value_rating": value_rating,
                "breakdown": {
                    "price_score": price_score,
                    "rating_score": rating_score,
                    "location_score": location_score,
                    "amenities_score": amenities_score
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating hotel score: {e}")
            return {"total_score": 0.5, "value_rating": 0.5, "breakdown": {}}
    
    async def _generate_recommendation_reasoning(
        self,
        top_hotels: List[Dict[str, Any]],
        preferences: Dict[str, Any],
        budget_max: float
    ) -> str:
        """Generate AI reasoning for hotel recommendations"""
        try:
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an expert travel advisor. Analyze the hotel recommendations and provide clear, 
                helpful reasoning for why these hotels are the best choices based on the user's preferences and budget.
                Be specific about the trade-offs and highlight the best value options."""),
                ("human", """
                User preferences: {preferences}
                Budget maximum: ${budget_max}
                Top recommended hotels: {hotels}
                
                Provide a clear explanation of why these hotels are recommended, focusing on value and fit with preferences.
                """)
            ])
            
            # Simplify hotel data for AI processing
            simplified_hotels = []
            for hotel in top_hotels[:3]:  # Top 3 only
                simplified_hotels.append({
                    "name": hotel.get("name"),
                    "price": hotel.get("price_per_night"),
                    "rating": hotel.get("rating"),
                    "distance": hotel.get("distance_from_center_km"),
                    "ai_score": hotel.get("ai_score", 0),
                    "value_rating": hotel.get("value_rating", 0)
                })
            
            chain = prompt | self.llm
            response = await chain.ainvoke({
                "preferences": json.dumps(preferences),
                "budget_max": budget_max,
                "hotels": json.dumps(simplified_hotels, indent=2)
            })
            
            return response.content
            
        except Exception as e:
            logger.error(f"Error generating recommendation reasoning: {e}")
            return "AI analysis temporarily unavailable. Recommendations are based on price, rating, and location optimization."
    
    async def get_travel_alerts(
        self,
        destinations: List[str],
        travel_dates: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """Get travel alerts for destinations"""
        try:
            alerts = {
                "weather_alerts": [],
                "travel_advisories": [],
                "health_alerts": [],
                "security_alerts": [],
                "general_alerts": []
            }
            
            for destination in destinations:
                # Get weather alerts
                weather_alerts = await self._get_weather_alerts(destination, travel_dates)
                alerts["weather_alerts"].extend(weather_alerts)
                
                # Get travel advisories (simulated - would use real APIs)
                advisory_alerts = await self._get_travel_advisories(destination)
                alerts["travel_advisories"].extend(advisory_alerts)
                
                # Get health alerts
                health_alerts = await self._get_health_alerts(destination)
                alerts["health_alerts"].extend(health_alerts)
            
            # Prioritize alerts by severity
            all_alerts = []
            for category, category_alerts in alerts.items():
                for alert in category_alerts:
                    alert["category"] = category
                    all_alerts.append(alert)
            
            # Sort by severity
            severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
            all_alerts.sort(key=lambda x: severity_order.get(x.get("severity", "low"), 3))
            
            return {
                "status": "success",
                "alerts_by_category": alerts,
                "prioritized_alerts": all_alerts,
                "total_alerts": len(all_alerts),
                "critical_count": len([a for a in all_alerts if a.get("severity") == "critical"])
            }
            
        except Exception as e:
            logger.error(f"Error getting travel alerts: {e}")
            return {"status": "error", "message": str(e)}
    
    async def _get_weather_alerts(
        self,
        destination: str,
        travel_dates: Dict[str, str] = None
    ) -> List[Dict[str, Any]]:
        """Get weather alerts for destination"""
        try:
            # Simulate weather alerts (in production, use real weather APIs)
            mock_alerts = [
                {
                    "type": "weather",
                    "destination": destination,
                    "severity": "medium",
                    "title": f"Rainy season in {destination}",
                    "description": f"Heavy rainfall expected in {destination} during your travel dates. Pack waterproof clothing.",
                    "start_date": "2024-12-01",
                    "end_date": "2024-12-31",
                    "recommendations": ["Pack umbrella", "Waterproof shoes", "Indoor activities"]
                }
            ]
            
            # Filter based on travel dates if provided
            if travel_dates:
                # In production, filter alerts based on actual travel dates
                pass
            
            return mock_alerts
            
        except Exception as e:
            logger.error(f"Error getting weather alerts: {e}")
            return []
    
    async def _get_travel_advisories(self, destination: str) -> List[Dict[str, Any]]:
        """Get travel advisories for destination"""
        try:
            # Simulate travel advisories (in production, use government APIs)
            mock_advisories = [
                {
                    "type": "advisory",
                    "destination": destination,
                    "severity": "low",
                    "title": f"General travel advisory for {destination}",
                    "description": f"Exercise normal precautions when traveling to {destination}.",
                    "issued_date": "2024-01-01",
                    "recommendations": ["Keep documents safe", "Stay aware of surroundings"]
                }
            ]
            
            return mock_advisories
            
        except Exception as e:
            logger.error(f"Error getting travel advisories: {e}")
            return []
    
    async def _get_health_alerts(self, destination: str) -> List[Dict[str, Any]]:
        """Get health alerts for destination"""
        try:
            # Simulate health alerts (in production, use WHO/CDC APIs)
            mock_health_alerts = []
            
            # Add seasonal health recommendations
            current_month = datetime.now().month
            if current_month in [6, 7, 8]:  # Summer months
                mock_health_alerts.append({
                    "type": "health",
                    "destination": destination,
                    "severity": "low",
                    "title": "Summer health precautions",
                    "description": "High temperatures expected. Stay hydrated and use sun protection.",
                    "recommendations": ["Drink plenty of water", "Use sunscreen", "Avoid midday sun"]
                })
            
            return mock_health_alerts
            
        except Exception as e:
            logger.error(f"Error getting health alerts: {e}")
            return []
    
    async def generate_ai_travel_tips(
        self,
        destination: str,
        travel_style: str,
        duration: int,
        budget: float
    ) -> Dict[str, Any]:
        """Generate AI-powered travel tips for destination"""
        try:
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an expert travel advisor with deep knowledge of destinations worldwide. 
                Generate practical, personalized travel tips that are specific to the destination, travel style, and budget."""),
                ("human", """
                Destination: {destination}
                Travel style: {travel_style}
                Duration: {duration} days
                Budget: ${budget}
                
                Generate 8-10 specific, actionable travel tips covering:
                1. Local customs and etiquette
                2. Money-saving tips
                3. Hidden gems and local experiences
                4. Food recommendations
                5. Transportation tips
                6. Safety and health advice
                7. Best times to visit attractions
                8. Cultural insights
                
                Format as a JSON array of tip objects with "category", "tip", and "priority" fields.
                """)
            ])
            
            chain = prompt | self.llm
            response = await chain.ainvoke({
                "destination": destination,
                "travel_style": travel_style,
                "duration": duration,
                "budget": budget
            })
            
            # Parse AI response
            try:
                tips_data = json.loads(response.content)
                if isinstance(tips_data, list):
                    return {
                        "status": "success",
                        "destination": destination,
                        "tips": tips_data,
                        "generated_at": datetime.utcnow().isoformat()
                    }
            except json.JSONDecodeError:
                # Fallback to text format
                return {
                    "status": "success",
                    "destination": destination,
                    "tips_text": response.content,
                    "generated_at": datetime.utcnow().isoformat()
                }
            
        except Exception as e:
            logger.error(f"Error generating AI travel tips: {e}")
            return {
                "status": "error",
                "message": str(e),
                "fallback_tips": self._get_fallback_tips(destination)
            }
    
    def _get_fallback_tips(self, destination: str) -> List[Dict[str, Any]]:
        """Get fallback travel tips when AI generation fails"""
        return [
            {
                "category": "general",
                "tip": f"Research local customs and traditions before visiting {destination}",
                "priority": "high"
            },
            {
                "category": "money",
                "tip": "Use local currency and compare exchange rates",
                "priority": "medium"
            },
            {
                "category": "safety",
                "tip": "Keep copies of important documents in separate locations",
                "priority": "high"
            },
            {
                "category": "food",
                "tip": "Try local street food from busy stalls for authentic experiences",
                "priority": "medium"
            }
        ]
    
    async def optimize_itinerary_timing(
        self,
        itinerary: Dict[str, Any],
        preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Optimize itinerary timing using AI"""
        try:
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an expert travel planner. Optimize the timing and sequence of activities 
                in the itinerary to minimize travel time, avoid crowds, and maximize enjoyment based on preferences."""),
                ("human", """
                Current itinerary: {itinerary}
                User preferences: {preferences}
                
                Optimize the timing and provide:
                1. Suggested time slots for each activity
                2. Reasoning for timing choices
                3. Alternative options for flexibility
                4. Crowd avoidance strategies
                
                Return optimized itinerary with timing recommendations.
                """)
            ])
            
            chain = prompt | self.llm
            response = await chain.ainvoke({
                "itinerary": json.dumps(itinerary),
                "preferences": json.dumps(preferences)
            })
            
            return {
                "status": "success",
                "optimized_itinerary": response.content,
                "optimization_applied": True,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error optimizing itinerary timing: {e}")
            return {
                "status": "error",
                "message": str(e),
                "original_itinerary": itinerary
            }

# Export for easy import
__all__ = ['AdvancedAIService']
